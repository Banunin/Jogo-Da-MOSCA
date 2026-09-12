import { create } from "zustand";
import type { MapId } from "./maps";

export const MULTIPLAYER_SLOTS = ["fly-1", "fly-2", "fly-3", "fly-4", "human-1"] as const;
export type MultiplayerSlotId = (typeof MULTIPLAYER_SLOTS)[number];

export interface NetworkPose {
  x: number; y: number; z: number;
  yaw: number; pitch: number;
  speed: number;
  flying: boolean;
  state: string;
  mapId?: string;
  skin?: "classic" | "platinum";
}

export interface NetworkPeerState {
  clientId: string;
  slotId: MultiplayerSlotId;
  name: string;
  pose: NetworkPose | null;
}

export interface NetworkGameEvent {
  type: "human-attack";
  sourceClientId: string;
  x: number; y: number; z: number;
  radius: number;
  damage: number;
}

interface SlotState { slotId: MultiplayerSlotId; ownerId: string | null; ownerName: string | null; }
interface RoomState {
  id: string | null;
  name: string | null;
  mapId: MapId | null;
  hostClientId: string | null;
}
interface MultiplayerState {
  status: "offline" | "connecting" | "connected" | "error";
  error: string | null;
  clientId: string | null;
  role: MultiplayerSlotId | null;
  slots: SlotState[];
  peers: NetworkPeerState[];
  room: RoomState;
}

const emptySlots = (): SlotState[] => MULTIPLAYER_SLOTS.map((slotId) => ({ slotId, ownerId: null, ownerName: null }));
const emptyRoom = (): RoomState => ({ id: null, name: null, mapId: null, hostClientId: null });
export const useMultiplayerStore = create<MultiplayerState>(() => ({
  status: "offline", error: null, clientId: null, role: null, slots: emptySlots(), peers: [], room: emptyRoom(),
}));

type EventListener = (event: NetworkGameEvent) => void;
type PendingAction =
  | { type: "create-room"; roomName: string; password: string; playerName: string; mapId: MapId }
  | { type: "join-room"; roomName: string; password: string; playerName: string };

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private poseClock = 0;
  private eventListeners = new Set<EventListener>();
  private name = "Jogador";
  private pendingAction: PendingAction | null = null;

  private targetUrl(url?: string): string {
    if (url) return url;
    const query = new URLSearchParams(location.search);
    const override = query.get("ws") || localStorage.getItem("musca-ws-url");
    if (override) return override;
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${location.host}/ws`;
  }

  connect(url?: string): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      if (this.ws.readyState === WebSocket.OPEN) this.flushPending();
      return;
    }
    useMultiplayerStore.setState({ status: "connecting", error: null, role: null, room: emptyRoom() });
    const ws = new WebSocket(this.targetUrl(url));
    this.ws = ws;
    ws.addEventListener("open", () => useMultiplayerStore.setState({ status: "connected", error: null }));
    ws.addEventListener("close", () => {
      if (this.ws !== ws) return;
      this.ws = null;
      useMultiplayerStore.setState({ status: "offline", clientId: null, role: null, peers: [], slots: emptySlots(), room: emptyRoom() });
    });
    ws.addEventListener("error", () => useMultiplayerStore.setState({ status: "error", error: "Não foi possível conectar ao serviço multiplayer deste site." }));
    ws.addEventListener("message", (e) => {
      let msg: any;
      try { msg = JSON.parse(String(e.data)); } catch { return; }
      if (msg.type === "welcome") {
        useMultiplayerStore.setState({ clientId: msg.clientId });
        this.flushPending();
      } else if (msg.type === "room-joined") {
        useMultiplayerStore.setState({
          error: null,
          room: { id: msg.room?.id ?? null, name: msg.room?.name ?? null, mapId: msg.room?.mapId ?? null, hostClientId: msg.room?.hostClientId ?? null },
          slots: msg.slots ?? emptySlots(), peers: msg.peers ?? [], role: null,
        });
      } else if (msg.type === "room-left" || msg.type === "room-closed") {
        useMultiplayerStore.setState({
          error: msg.type === "room-closed" ? (msg.reason || "O anfitrião encerrou a sala.") : null,
          role: null, peers: [], slots: emptySlots(), room: emptyRoom(),
        });
      } else if (msg.type === "room-error") {
        useMultiplayerStore.setState({ error: String(msg.message || "Não foi possível entrar na sala."), role: null });
      } else if (msg.type === "lobby") {
        useMultiplayerStore.setState({
          slots: msg.slots ?? emptySlots(), peers: msg.peers ?? [],
          room: msg.room ? { id: msg.room.id ?? null, name: msg.room.name ?? null, mapId: msg.room.mapId ?? null, hostClientId: msg.room.hostClientId ?? null } : useMultiplayerStore.getState().room,
        });
      } else if (msg.type === "peer-pose" && msg.peer?.clientId) {
        const state = useMultiplayerStore.getState();
        const peers = state.peers.some((peer) => peer.clientId === msg.peer.clientId)
          ? state.peers.map((peer) => peer.clientId === msg.peer.clientId ? msg.peer as NetworkPeerState : peer)
          : [...state.peers, msg.peer as NetworkPeerState];
        useMultiplayerStore.setState({ peers });
      } else if (msg.type === "claim-ok") useMultiplayerStore.setState({ role: msg.slotId, error: null });
      else if (msg.type === "claim-denied") useMultiplayerStore.setState({ error: "Esse personagem acabou de ser escolhido por outro jogador." });
      else if (msg.type === "game-event") for (const listener of this.eventListeners) listener(msg.event as NetworkGameEvent);
    });
  }

  private flushPending(): void {
    if (!this.pendingAction || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const action = this.pendingAction;
    this.pendingAction = null;
    this.ws.send(JSON.stringify(action));
  }

  createRoom(roomName: string, password: string, playerName: string, mapId: MapId): void {
    const cleanPlayer = playerName.trim().slice(0, 24) || "Jogador";
    this.name = cleanPlayer;
    this.pendingAction = { type: "create-room", roomName: roomName.trim(), password, playerName: cleanPlayer, mapId };
    useMultiplayerStore.setState({ error: null });
    this.connect();
  }

  joinRoom(roomName: string, password: string, playerName: string): void {
    const cleanPlayer = playerName.trim().slice(0, 24) || "Jogador";
    this.name = cleanPlayer;
    this.pendingAction = { type: "join-room", roomName: roomName.trim(), password, playerName: cleanPlayer };
    useMultiplayerStore.setState({ error: null });
    this.connect();
  }

  leaveRoom(): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: "leave-room" }));
    useMultiplayerStore.setState({ role: null, peers: [], slots: emptySlots(), room: emptyRoom(), error: null });
  }

  disconnect(): void {
    this.pendingAction = null;
    this.ws?.close();
    this.ws = null;
  }

  claim(slotId: MultiplayerSlotId, name: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !useMultiplayerStore.getState().room.id) return;
    this.name = name.trim().slice(0, 24) || "Jogador";
    this.ws.send(JSON.stringify({ type: "claim", slotId, name: this.name }));
  }

  release(): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: "release" }));
    useMultiplayerStore.setState({ role: null });
  }

  sendPose(pose: NetworkPose): void {
    const now = performance.now();
    if (now - this.poseClock < 55) return;
    this.poseClock = now;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !useMultiplayerStore.getState().role) return;
    this.ws.send(JSON.stringify({ type: "pose", pose }));
  }

  sendGameEvent(event: Omit<NetworkGameEvent, "sourceClientId">): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !useMultiplayerStore.getState().room.id) return;
    this.ws.send(JSON.stringify({ type: "game-event", event }));
  }

  onGameEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }
}

export const multiplayerClient = new MultiplayerClient();
