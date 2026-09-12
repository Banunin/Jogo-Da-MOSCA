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
  roomCode: string;
  isHost: boolean;
}

const emptySlots = (): SlotState[] => MULTIPLAYER_SLOTS.map((slotId) => ({ slotId, ownerId: null, ownerName: null }));
const emptyRoom = (): RoomState => ({ id: null, name: null, mapId: null, hostClientId: null });
export const useMultiplayerStore = create<MultiplayerState>(() => ({
  status: "offline", error: null, clientId: null, role: null, slots: emptySlots(), peers: [], room: emptyRoom(), roomCode: "", isHost: false,
}));

type EventListener = (event: NetworkGameEvent) => void;
type WireMessage = any;
type PeerConnection = {
  peer: string;
  open: boolean;
  send: (data: unknown) => void;
  close: () => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
};
type PeerInstance = {
  id: string;
  destroyed?: boolean;
  connect: (peerId: string, options?: Record<string, unknown>) => PeerConnection;
  destroy: () => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
};
type PeerConstructor = new (idOrOptions?: string | Record<string, unknown>, options?: Record<string, unknown>) => PeerInstance;

declare global {
  interface Window { Peer?: PeerConstructor; }
}

type HostPeer = {
  conn: PeerConnection;
  clientId: string | null;
  name: string;
};

const PEER_OPTIONS = { host: "0.peerjs.com", port: 443, path: "/", secure: true, debug: 1 } as const;
const ROOM_PREFIX = "musca-beta-";
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomId(prefix = "p"): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return `${prefix}_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function randomRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => ROOM_ALPHABET[b % ROOM_ALPHABET.length]).join("");
}

function cleanRoomCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

async function peerConstructor(): Promise<PeerConstructor> {
  const started = performance.now();
  while (!window.Peer && performance.now() - started < 8000) {
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
  if (!window.Peer) throw new Error("serviço de conexão P2P não carregou");
  return window.Peer;
}

function waitForPeerOpen(peer: PeerInstance, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    const timer = window.setTimeout(() => done(() => reject(new Error("tempo de conexão esgotado"))), timeoutMs);
    peer.on("open", (id: string) => done(() => resolve(id)));
    peer.on("error", (error: any) => done(() => reject(error instanceof Error ? error : new Error(String(error?.type ?? error)))));
  });
}

class MultiplayerClient {
  private poseClock = 0;
  private eventListeners = new Set<EventListener>();
  private name = "Jogador";
  private peer: PeerInstance | null = null;
  private hostPeers = new Map<string, HostPeer>();
  private hostPeerSlots = new Map<string, MultiplayerSlotId>();
  private hostPeerPoses = new Map<string, NetworkPose>();
  private guestConnection: PeerConnection | null = null;
  private roomPassword = "";

  connect(): void { /* PeerJS abre a conexão automaticamente ao criar/entrar na sala. */ }
  setPublicBackendUrl(): void { /* compatibilidade com builds anteriores */ }

  async createRoom(_roomName: string, password: string, playerName: string, mapId: MapId): Promise<void> {
    this.disconnect();
    this.name = playerName.trim() || "Jogador";
    this.roomPassword = password;
    useMultiplayerStore.setState({ status: "connecting", error: null, roomCode: "", isHost: true });

    try {
      const Peer = await peerConstructor();
      let openedPeer: PeerInstance | null = null;
      let code = "";

      for (let attempt = 0; attempt < 6; attempt += 1) {
        code = randomRoomCode();
        const candidate = new Peer(`${ROOM_PREFIX}${code}`, PEER_OPTIONS);
        try {
          await waitForPeerOpen(candidate);
          openedPeer = candidate;
          break;
        } catch (error: any) {
          try { candidate.destroy(); } catch { /* noop */ }
          const type = String(error?.type ?? error?.message ?? error);
          if (!type.includes("unavailable-id")) throw error;
        }
      }

      if (!openedPeer || !code) throw new Error("não foi possível reservar um código de sala");
      this.peer = openedPeer;
      const clientId = randomId("host");
      const room = { id: code, name: `Sala ${code}`, mapId, hostClientId: clientId };

      openedPeer.on("connection", (conn: PeerConnection) => this.acceptIncomingConnection(conn));
      openedPeer.on("error", (error: any) => {
        const type = String(error?.type ?? "");
        if (type === "peer-unavailable") return;
        useMultiplayerStore.setState({ error: `Erro P2P: ${String(error?.message ?? type || error)}` });
      });

      useMultiplayerStore.setState({
        status: "connected", error: null, clientId, role: null, slots: emptySlots(), peers: [], room, roomCode: code, isHost: true,
      });
    } catch (error) {
      this.disconnect();
      useMultiplayerStore.setState({ status: "error", error: `Não foi possível criar a sala. ${String(error)}` });
    }
  }

  async joinRoom(roomCode: string, password: string, playerName: string): Promise<void> {
    this.disconnect();
    this.name = playerName.trim() || "Jogador";
    const code = cleanRoomCode(roomCode);
    if (code.length < 4) {
      useMultiplayerStore.setState({ status: "error", error: "Código da sala inválido." });
      return;
    }

    useMultiplayerStore.setState({ status: "connecting", error: null, roomCode: code, isHost: false });
    try {
      const Peer = await peerConstructor();
      const peer = new Peer(PEER_OPTIONS);
      this.peer = peer;
      const peerId = await waitForPeerOpen(peer);
      const clientId = randomId("guest");
      useMultiplayerStore.setState({ clientId });

      peer.on("error", (error: any) => {
        const type = String(error?.type ?? "");
        if (type === "peer-unavailable") {
          useMultiplayerStore.setState({ status: "error", error: "Sala não encontrada. Confira o código e se o anfitrião ainda está online." });
          return;
        }
        useMultiplayerStore.setState({ status: "error", error: `Erro P2P: ${String(error?.message ?? type || error)}` });
      });

      const conn = peer.connect(`${ROOM_PREFIX}${code}`, { reliable: true, serialization: "json" });
      this.guestConnection = conn;
      conn.on("open", () => {
        conn.send({ type: "auth", password, clientId, name: this.name, peerId });
      });
      conn.on("data", (data: unknown) => this.handleGuestMessage(data));
      conn.on("close", () => {
        if (useMultiplayerStore.getState().room.id) {
          useMultiplayerStore.setState({ status: "offline", role: null, peers: [], slots: emptySlots(), room: emptyRoom(), error: "O anfitrião encerrou a conexão." });
        }
      });
      conn.on("error", (error: any) => useMultiplayerStore.setState({ status: "error", error: `Falha na conexão da sala. ${String(error?.message ?? error)}` }));
    } catch (error) {
      this.disconnect();
      useMultiplayerStore.setState({ status: "error", error: `Não foi possível entrar na sala. ${String(error)}` });
    }
  }

  joinByInvite(roomCode: string, password: string, playerName: string): Promise<void> {
    return this.joinRoom(roomCode, password, playerName);
  }

  private acceptIncomingConnection(conn: PeerConnection): void {
    const entry: HostPeer = { conn, clientId: null, name: "Convidado" };
    this.hostPeers.set(conn.peer, entry);
    conn.on("data", (data: unknown) => this.handleHostMessage(entry, data));
    conn.on("close", () => this.removeHostPeer(entry));
    conn.on("error", () => this.removeHostPeer(entry));
  }

  private handleHostMessage(peer: HostPeer, data: unknown): void {
    const msg = data as WireMessage;
    if (!msg || typeof msg !== "object") return;

    if (!peer.clientId) {
      if (msg.type !== "auth") return;
      if (String(msg.password ?? "") !== this.roomPassword) {
        peer.conn.send({ type: "auth-denied", message: "Senha incorreta." });
        window.setTimeout(() => peer.conn.close(), 100);
        return;
      }
      peer.clientId = String(msg.clientId || randomId("guest"));
      peer.name = String(msg.name || "Jogador").slice(0, 24);
      peer.conn.send({ type: "auth-ok", room: useMultiplayerStore.getState().room });
      this.broadcastLobby();
      return;
    }

    if (msg.type === "claim") {
      const slotId = msg.slotId as MultiplayerSlotId;
      if (!MULTIPLAYER_SLOTS.includes(slotId)) return;
      const state = useMultiplayerStore.getState();
      const occupied = state.slots.some((slot) => slot.slotId === slotId && slot.ownerId && slot.ownerId !== peer.clientId);
      if (occupied) { peer.conn.send({ type: "claim-denied" }); return; }
      this.hostPeerSlots.set(peer.clientId, slotId);
      this.setSlotOwner(peer.clientId, peer.name, slotId);
      peer.conn.send({ type: "claim-ok", slotId });
      this.broadcastLobby();
    } else if (msg.type === "release") {
      this.hostPeerSlots.delete(peer.clientId);
      this.clearSlotOwner(peer.clientId);
      this.broadcastLobby();
    } else if (msg.type === "pose" && msg.pose) {
      this.hostPeerPoses.set(peer.clientId, msg.pose as NetworkPose);
      const slotId = this.hostPeerSlots.get(peer.clientId);
      if (!slotId) return;
      const networkPeer: NetworkPeerState = { clientId: peer.clientId, slotId, name: peer.name, pose: msg.pose };
      this.broadcast({ type: "peer-pose", peer: networkPeer }, peer.clientId);
      this.refreshHostPeers();
    } else if (msg.type === "game-event" && msg.event) {
      const eventData = { ...msg.event, sourceClientId: peer.clientId } as NetworkGameEvent;
      this.broadcast({ type: "game-event", event: eventData }, peer.clientId);
      for (const listener of this.eventListeners) listener(eventData);
    }
  }

  private handleGuestMessage(data: unknown): void {
    const msg = data as WireMessage;
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "auth-ok" && msg.room) {
      useMultiplayerStore.setState({ room: msg.room, status: "connected", error: null, slots: emptySlots(), peers: [], role: null, isHost: false });
    } else if (msg.type === "auth-denied") {
      useMultiplayerStore.setState({ status: "error", error: msg.message || "Senha incorreta." });
    } else if (msg.type === "lobby") {
      useMultiplayerStore.setState({ room: msg.room ?? useMultiplayerStore.getState().room, slots: msg.slots ?? emptySlots(), peers: msg.peers ?? [] });
    } else if (msg.type === "claim-ok") {
      useMultiplayerStore.setState({ role: msg.slotId, error: null });
    } else if (msg.type === "claim-denied") {
      useMultiplayerStore.setState({ error: "Esse personagem já está sendo usado." });
    } else if (msg.type === "peer-pose" && msg.peer) {
      const networkPeer = msg.peer as NetworkPeerState;
      useMultiplayerStore.setState((state) => ({ peers: [...state.peers.filter((item) => item.clientId !== networkPeer.clientId), networkPeer] }));
    } else if (msg.type === "game-event" && msg.event) {
      for (const listener of this.eventListeners) listener(msg.event);
    } else if (msg.type === "room-closed") {
      this.disconnect();
      useMultiplayerStore.setState({ status: "offline", error: msg.reason || "A sala foi encerrada." });
    }
  }

  private setSlotOwner(clientId: string, name: string, slotId: MultiplayerSlotId): void {
    useMultiplayerStore.setState((state) => ({
      slots: state.slots.map((slot) => slot.slotId === slotId
        ? { ...slot, ownerId: clientId, ownerName: name }
        : slot.ownerId === clientId ? { ...slot, ownerId: null, ownerName: null } : slot),
    }));
  }

  private clearSlotOwner(clientId: string): void {
    useMultiplayerStore.setState((state) => ({ slots: state.slots.map((slot) => slot.ownerId === clientId ? { ...slot, ownerId: null, ownerName: null } : slot) }));
  }

  private removeHostPeer(peer: HostPeer): void {
    this.hostPeers.delete(peer.conn.peer);
    if (peer.clientId) {
      this.hostPeerSlots.delete(peer.clientId);
      this.hostPeerPoses.delete(peer.clientId);
      this.clearSlotOwner(peer.clientId);
    }
    try { peer.conn.close(); } catch { /* noop */ }
    this.broadcastLobby();
  }

  private broadcast(message: WireMessage, exceptClientId?: string): void {
    for (const peer of this.hostPeers.values()) {
      if (!peer.clientId || peer.clientId === exceptClientId || !peer.conn.open) continue;
      peer.conn.send(message);
    }
  }

  private participants(): NetworkPeerState[] {
    const state = useMultiplayerStore.getState();
    const peers: NetworkPeerState[] = [];
    if (state.clientId && state.role) peers.push({ clientId: state.clientId, slotId: state.role, name: this.name, pose: null });
    for (const peer of this.hostPeers.values()) {
      if (!peer.clientId) continue;
      const slotId = this.hostPeerSlots.get(peer.clientId);
      if (!slotId) continue;
      peers.push({ clientId: peer.clientId, slotId, name: peer.name, pose: this.hostPeerPoses.get(peer.clientId) ?? null });
    }
    return peers;
  }

  private refreshHostPeers(): void {
    const self = useMultiplayerStore.getState().clientId;
    useMultiplayerStore.setState({ peers: this.participants().filter((peer) => peer.clientId !== self) });
  }

  private broadcastLobby(): void {
    const state = useMultiplayerStore.getState();
    const participants = this.participants();
    this.refreshHostPeers();
    for (const peer of this.hostPeers.values()) {
      if (!peer.clientId || !peer.conn.open) continue;
      peer.conn.send({ type: "lobby", room: state.room, slots: state.slots, peers: participants.filter((item) => item.clientId !== peer.clientId) });
    }
  }

  leaveRoom(): void {
    const state = useMultiplayerStore.getState();
    if (state.isHost) this.broadcast({ type: "room-closed", reason: "O anfitrião encerrou a sala." });
    this.disconnect();
  }

  disconnect(): void {
    for (const peer of this.hostPeers.values()) { try { peer.conn.close(); } catch { /* noop */ } }
    this.hostPeers.clear();
    this.hostPeerSlots.clear();
    this.hostPeerPoses.clear();
    try { this.guestConnection?.close(); } catch { /* noop */ }
    this.guestConnection = null;
    try { this.peer?.destroy(); } catch { /* noop */ }
    this.peer = null;
    this.roomPassword = "";
    useMultiplayerStore.setState({ status: "offline", error: null, clientId: null, role: null, peers: [], slots: emptySlots(), room: emptyRoom(), roomCode: "", isHost: false });
  }

  claim(slotId: MultiplayerSlotId, name = this.name): void {
    this.name = name || this.name;
    const state = useMultiplayerStore.getState();
    if (!state.room.id || !state.clientId) return;
    if (state.isHost) {
      const occupied = state.slots.some((slot) => slot.slotId === slotId && slot.ownerId && slot.ownerId !== state.clientId);
      if (occupied) { useMultiplayerStore.setState({ error: "Esse personagem já está sendo usado." }); return; }
      this.setSlotOwner(state.clientId, this.name, slotId);
      useMultiplayerStore.setState({ role: slotId, error: null });
      this.broadcastLobby();
    } else if (this.guestConnection?.open) {
      this.guestConnection.send({ type: "claim", slotId, name: this.name });
    }
  }

  release(): void {
    const state = useMultiplayerStore.getState();
    if (state.isHost && state.clientId) {
      this.clearSlotOwner(state.clientId);
      useMultiplayerStore.setState({ role: null });
      this.broadcastLobby();
    } else if (this.guestConnection?.open) {
      this.guestConnection.send({ type: "release" });
      useMultiplayerStore.setState({ role: null });
    }
  }

  updatePose(dt: number, pose: NetworkPose): void {
    this.poseClock += dt;
    if (this.poseClock < 0.055) return;
    this.poseClock = 0;
    const state = useMultiplayerStore.getState();
    if (!state.room.id || !state.role || !state.clientId) return;
    if (state.isHost) {
      const self: NetworkPeerState = { clientId: state.clientId, slotId: state.role, name: this.name, pose };
      this.broadcast({ type: "peer-pose", peer: self });
    } else if (this.guestConnection?.open) {
      this.guestConnection.send({ type: "pose", pose });
    }
  }

  sendGameEvent(event: Omit<NetworkGameEvent, "sourceClientId">): void {
    const state = useMultiplayerStore.getState();
    if (!state.room.id || !state.clientId) return;
    if (state.isHost) {
      const withSource = { ...event, sourceClientId: state.clientId } as NetworkGameEvent;
      this.broadcast({ type: "game-event", event: withSource });
      for (const listener of this.eventListeners) listener(withSource);
    } else if (this.guestConnection?.open) {
      this.guestConnection.send({ type: "game-event", event });
    }
  }

  onGameEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }
}

export const multiplayerClient = new MultiplayerClient();
