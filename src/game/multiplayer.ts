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

const PUBLIC_BACKEND_KEY = "musca-multiplayer-url";
const DEFAULT_PUBLIC_BACKEND = (import.meta.env.VITE_MUSCA_MULTIPLAYER_URL as string | undefined)?.trim() || "";

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private poseClock = 0;
  private eventListeners = new Set<EventListener>();
  private name = "Jogador";
  private pendingAction: PendingAction | null = null;

  private targetUrl(url?: string): string | null {
    if (url) return url;
    const query = new URLSearchParams(location.search);
    const override = query.get("ws") || localStorage.getItem(PUBLIC_BACKEND_KEY) || localStorage.getItem("musca-ws-url");
    if (override) return override;

    const onGitHubPages = location.hostname.endsWith("github.io");
    if (onGitHubPages) return DEFAULT_PUBLIC_BACKEND || null;

    const protocol = location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${location.host}/ws`;
  }

  connect(url?: string): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      if (this.ws.readyState === WebSocket.OPEN) this.flushPending();
      return;
    }

    const target = this.targetUrl(url);
    if (!target) {
      useMultiplayerStore.setState({
        status: "error",
        error: "O multiplayer online ainda não tem um servidor público configurado para esta versão do GitHub Pages.",
        role: null,
        room: emptyRoom(),
      });
      return;
    }

    useMultiplayerStore.setState({ status: "connecting", error: null, role: null, room: emptyRoom() });
    let ws: WebSocket;
    try {
      ws = new WebSocket(target);
    } catch {
      useMultiplayerStore.setState({ status: "error", error: "Endereço do servidor multiplayer inválido." });
      return;
    }
    this.ws = ws;
    ws.addEventListener("open", () => useMultiplayerStore.setState({ status: "connected", error: null }));
    ws.addEventListener("close", () => {
      if (this.ws !== ws) return;
      this.ws = null;
      useMultiplayerStore.setState({ status: "offline", clientId: null, role: null, peers: [], slots: emptySlots(), room: emptyRoom() });
    });
    ws.addEventListener("error", () => useMultiplayerStore.setState({ status: "error", error: "Não foi possível conectar ao servidor multiplayer." }));
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
      } else if (msg.type === "lobby") {
        useMultiplayerStore.setState({
          room: { id: msg.room?.id ?? null, name: msg.room?.name ?? null, mapId: msg.room?.mapId ?? null, hostClientId: msg.room?.hostClientId ?? null },
          slots: msg.slots ?? emptySlots(), peers: msg.peers ?? [],
        });
      } else if (msg.type === "room-error") {
        useMultiplayerStore.setState({ error: msg.message || "Erro na sala." });
      } else if (msg.type === "room-closed") {
        useMultiplayerStore.setState({ role: null, peers: [], slots: emptySlots(), room: emptyRoom(), error: msg.reason || "A sala foi encerrada." });
      } else if (msg.type === "claim-ok") {
        useMultiplayerStore.setState({ role: msg.slotId, error: null });
      } else if (msg.type === "claim-denied") {
        useMultiplayerStore.setState({ error: "Esse personagem já está sendo usado." });
      } else if (msg.type === "peer-pose" && msg.peer) {
        const peer = msg.peer as NetworkPeerState;
        useMultiplayerStore.setState((state) => ({ peers: [...state.peers.filter((item) => item.clientId !== peer.clientId), peer] }));
      } else if (msg.type === "game-event" && msg.event) {
        for (const listener of this.eventListeners) listener(msg.event);
      }
    });
  }

  setPublicBackendUrl(url: string): void {
    const clean = url.trim();
    if (clean) localStorage.setItem(PUBLIC_BACKEND_KEY, clean);
    else localStorage.removeItem(PUBLIC_BACKEND_KEY);
  }

  createRoom(roomName: string, password: string, playerName: string, mapId: MapId): void {
    this.pendingAction = { type: "create-room", roomName, password, playerName, mapId };
    this.name = playerName || "Jogador";
    this.connect();
  }

  joinRoom(roomName: string, password: string, playerName: string): void {
    this.pendingAction = { type: "join-room", roomName, password, playerName };
    this.name = playerName || "Jogador";
    this.connect();
  }

  private flushPending(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.pendingAction) return;
    this.ws.send(JSON.stringify(this.pendingAction));
    this.pendingAction = null;
  }

  leaveRoom(): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: "leave-room" }));
    useMultiplayerStore.setState({ role: null, peers: [], slots: emptySlots(), room: emptyRoom(), error: null });
  }

  claim(slotId: MultiplayerSlotId, name = this.name): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !useMultiplayerStore.getState().room.id) return;
    this.ws.send(JSON.stringify({ type: "claim", slotId, name }));
  }

  release(): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: "release" }));
    useMultiplayerStore.setState({ role: null });
  }

  updatePose(dt: number, pose: NetworkPose): void {
    this.poseClock += dt;
    if (this.poseClock < 0.055) return;
    this.poseClock = 0;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !useMultiplayerStore.getState().room.id) return;
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
