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
  inviteCode: string;
  responseCode: string;
  isHost: boolean;
}

const emptySlots = (): SlotState[] => MULTIPLAYER_SLOTS.map((slotId) => ({ slotId, ownerId: null, ownerName: null }));
const emptyRoom = (): RoomState => ({ id: null, name: null, mapId: null, hostClientId: null });
export const useMultiplayerStore = create<MultiplayerState>(() => ({
  status: "offline", error: null, clientId: null, role: null, slots: emptySlots(), peers: [], room: emptyRoom(),
  inviteCode: "", responseCode: "", isHost: false,
}));

type EventListener = (event: NetworkGameEvent) => void;
type WireMessage = any;
type OfferPayload = {
  v: 1; kind: "musca-offer"; token: string; room: { id: string; name: string; mapId: MapId; hostClientId: string };
  salt: string; verifier: string; offer: RTCSessionDescriptionInit;
};
type AnswerPayload = {
  v: 1; kind: "musca-answer"; token: string; clientId: string; name: string; answer: RTCSessionDescriptionInit;
};

type HostPeer = {
  token: string;
  pc: RTCPeerConnection;
  channel: RTCDataChannel;
  clientId: string | null;
  name: string;
};

const rtcConfig: RTCConfiguration = { iceServers: [] };

function randomId(prefix = "p"): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return `${prefix}_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function encodeSignal(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeSignal<T>(text: string): T {
  const clean = text.trim().replace(/-/g, "+").replace(/_/g, "/");
  const padded = clean + "=".repeat((4 - clean.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

async function digest(text: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

function waitForIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener("icegatheringstatechange", check);
      clearTimeout(timer);
      resolve();
    };
    const check = () => { if (pc.iceGatheringState === "complete") done(); };
    const timer = window.setTimeout(done, 2500);
    pc.addEventListener("icegatheringstatechange", check);
  });
}

class MultiplayerClient {
  private poseClock = 0;
  private eventListeners = new Set<EventListener>();
  private name = "Jogador";
  private hostPeers = new Map<string, HostPeer>();
  private hostPeerSlots = new Map<string, MultiplayerSlotId>();
  private hostPeerPoses = new Map<string, NetworkPose>();
  private guestPc: RTCPeerConnection | null = null;
  private guestChannel: RTCDataChannel | null = null;
  private guestPendingRoom: OfferPayload["room"] | null = null;
  private guestToken = "";

  connect(): void { /* transporte manual: o handshake acontece por códigos */ }
  setPublicBackendUrl(): void { /* compatibilidade com builds anteriores */ }

  async createRoom(roomName: string, password: string, playerName: string, mapId: MapId): Promise<void> {
    this.disconnect();
    this.name = playerName.trim() || "Jogador";
    const clientId = randomId("host");
    const room = { id: randomId("room"), name: roomName.trim(), mapId, hostClientId: clientId };
    useMultiplayerStore.setState({
      status: "connected", error: null, clientId, role: null, slots: emptySlots(), peers: [], room,
      inviteCode: "", responseCode: "", isHost: true,
    });
    await this.generateInvite(password);
  }

  async generateInvite(password: string): Promise<void> {
    const state = useMultiplayerStore.getState();
    if (!state.isHost || !state.room.id || !state.room.name || !state.room.mapId || !state.clientId) return;
    try {
      const token = randomId("invite");
      const pc = new RTCPeerConnection(rtcConfig);
      const channel = pc.createDataChannel("musca", { ordered: true });
      const peer: HostPeer = { token, pc, channel, clientId: null, name: "Convidado" };
      this.hostPeers.set(token, peer);
      this.bindHostChannel(peer);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIce(pc);
      const salt = randomId("salt");
      const verifier = await digest(`${salt}:${password}`);
      const payload: OfferPayload = {
        v: 1, kind: "musca-offer", token,
        room: { id: state.room.id, name: state.room.name, mapId: state.room.mapId, hostClientId: state.clientId },
        salt, verifier, offer: pc.localDescription!,
      };
      useMultiplayerStore.setState({ inviteCode: encodeSignal(payload), error: null });
    } catch (error) {
      useMultiplayerStore.setState({ status: "error", error: `Não foi possível gerar o convite P2P. ${String(error)}` });
    }
  }

  async joinByInvite(inviteCode: string, password: string, playerName: string): Promise<void> {
    this.disconnect();
    this.name = playerName.trim() || "Jogador";
    useMultiplayerStore.setState({ status: "connecting", error: null, inviteCode: "", responseCode: "", isHost: false });
    try {
      const payload = decodeSignal<OfferPayload>(inviteCode);
      if (payload.v !== 1 || payload.kind !== "musca-offer" || !payload.offer || !payload.room) throw new Error("convite inválido");
      const verifier = await digest(`${payload.salt}:${password}`);
      if (verifier !== payload.verifier) throw new Error("senha incorreta");

      const pc = new RTCPeerConnection(rtcConfig);
      this.guestPc = pc;
      this.guestPendingRoom = payload.room;
      this.guestToken = payload.token;
      const clientId = randomId("guest");
      useMultiplayerStore.setState({ clientId });
      pc.addEventListener("datachannel", (event) => {
        this.guestChannel = event.channel;
        this.bindGuestChannel(event.channel);
      });
      pc.addEventListener("connectionstatechange", () => {
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          useMultiplayerStore.setState({ status: "error", error: "A conexão P2P foi perdida." });
        }
      });
      await pc.setRemoteDescription(payload.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIce(pc);
      const response: AnswerPayload = { v: 1, kind: "musca-answer", token: payload.token, clientId, name: this.name, answer: pc.localDescription! };
      useMultiplayerStore.setState({ responseCode: encodeSignal(response), status: "connecting", error: null });
    } catch (error) {
      this.disconnect();
      useMultiplayerStore.setState({ status: "error", error: `Não foi possível preparar a conexão. ${String(error)}` });
    }
  }

  // Compatibilidade: o primeiro argumento agora é o código de convite.
  joinRoom(inviteCode: string, password: string, playerName: string): void {
    void this.joinByInvite(inviteCode, password, playerName);
  }

  async acceptResponse(responseCode: string): Promise<void> {
    try {
      const response = decodeSignal<AnswerPayload>(responseCode);
      if (response.v !== 1 || response.kind !== "musca-answer") throw new Error("resposta inválida");
      const peer = this.hostPeers.get(response.token);
      if (!peer) throw new Error("este convite não pertence a esta sala ou já expirou");
      peer.clientId = response.clientId;
      peer.name = response.name || "Jogador";
      await peer.pc.setRemoteDescription(response.answer);
      useMultiplayerStore.setState({ error: null });
    } catch (error) {
      useMultiplayerStore.setState({ error: `Não foi possível aceitar a resposta. ${String(error)}` });
    }
  }

  private bindHostChannel(peer: HostPeer): void {
    peer.channel.addEventListener("open", () => {
      if (!peer.clientId) return;
      peer.channel.send(JSON.stringify({ type: "room-joined", room: useMultiplayerStore.getState().room }));
      this.broadcastLobby();
      useMultiplayerStore.setState({ inviteCode: "" });
    });
    peer.channel.addEventListener("message", (event) => this.handleHostMessage(peer, String(event.data)));
    peer.channel.addEventListener("close", () => this.removeHostPeer(peer));
    peer.pc.addEventListener("connectionstatechange", () => {
      if (["failed", "closed", "disconnected"].includes(peer.pc.connectionState)) this.removeHostPeer(peer);
    });
  }

  private handleHostMessage(peer: HostPeer, raw: string): void {
    let msg: WireMessage;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!peer.clientId) return;
    if (msg.type === "claim") {
      const slotId = msg.slotId as MultiplayerSlotId;
      const state = useMultiplayerStore.getState();
      const occupied = state.slots.some((slot) => slot.slotId === slotId && slot.ownerId && slot.ownerId !== peer.clientId);
      if (occupied) { peer.channel.send(JSON.stringify({ type: "claim-denied" })); return; }
      this.hostPeerSlots.set(peer.clientId, slotId);
      this.setSlotOwner(peer.clientId, peer.name, slotId);
      peer.channel.send(JSON.stringify({ type: "claim-ok", slotId }));
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

  private bindGuestChannel(channel: RTCDataChannel): void {
    channel.addEventListener("open", () => {
      const room = this.guestPendingRoom;
      if (!room) return;
      useMultiplayerStore.setState({ status: "connected", error: null, room, responseCode: "", slots: emptySlots(), peers: [], role: null, isHost: false });
    });
    channel.addEventListener("message", (event) => this.handleGuestMessage(String(event.data)));
    channel.addEventListener("close", () => useMultiplayerStore.setState({ status: "offline", role: null, peers: [], room: emptyRoom() }));
  }

  private handleGuestMessage(raw: string): void {
    let msg: WireMessage;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === "room-joined" && msg.room) {
      useMultiplayerStore.setState({ room: msg.room, status: "connected", error: null, responseCode: "" });
    } else if (msg.type === "lobby") {
      useMultiplayerStore.setState({ room: msg.room ?? useMultiplayerStore.getState().room, slots: msg.slots ?? emptySlots(), peers: msg.peers ?? [] });
    } else if (msg.type === "claim-ok") {
      useMultiplayerStore.setState({ role: msg.slotId, error: null });
    } else if (msg.type === "claim-denied") {
      useMultiplayerStore.setState({ error: "Esse personagem já está sendo usado." });
    } else if (msg.type === "peer-pose" && msg.peer) {
      const peer = msg.peer as NetworkPeerState;
      useMultiplayerStore.setState((state) => ({ peers: [...state.peers.filter((item) => item.clientId !== peer.clientId), peer] }));
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
    this.hostPeers.delete(peer.token);
    if (peer.clientId) {
      this.hostPeerSlots.delete(peer.clientId);
      this.hostPeerPoses.delete(peer.clientId);
      this.clearSlotOwner(peer.clientId);
    }
    try { peer.pc.close(); } catch { /* noop */ }
    this.broadcastLobby();
  }

  private broadcast(message: WireMessage, exceptClientId?: string): void {
    const raw = JSON.stringify(message);
    for (const peer of this.hostPeers.values()) {
      if (peer.clientId === exceptClientId || peer.channel.readyState !== "open") continue;
      peer.channel.send(raw);
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
      if (!peer.clientId || peer.channel.readyState !== "open") continue;
      peer.channel.send(JSON.stringify({ type: "lobby", room: state.room, slots: state.slots, peers: participants.filter((item) => item.clientId !== peer.clientId) }));
    }
  }

  leaveRoom(): void {
    const state = useMultiplayerStore.getState();
    if (state.isHost) this.broadcast({ type: "room-closed", reason: "O anfitrião encerrou a sala." });
    this.disconnect();
  }

  disconnect(): void {
    for (const peer of this.hostPeers.values()) { try { peer.pc.close(); } catch { /* noop */ } }
    this.hostPeers.clear();
    this.hostPeerSlots.clear();
    this.hostPeerPoses.clear();
    try { this.guestPc?.close(); } catch { /* noop */ }
    this.guestPc = null;
    this.guestChannel = null;
    this.guestPendingRoom = null;
    this.guestToken = "";
    useMultiplayerStore.setState({ status: "offline", error: null, clientId: null, role: null, peers: [], slots: emptySlots(), room: emptyRoom(), inviteCode: "", responseCode: "", isHost: false });
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
    } else if (this.guestChannel?.readyState === "open") {
      this.guestChannel.send(JSON.stringify({ type: "claim", slotId, name: this.name }));
    }
  }

  release(): void {
    const state = useMultiplayerStore.getState();
    if (state.isHost && state.clientId) {
      this.clearSlotOwner(state.clientId);
      useMultiplayerStore.setState({ role: null });
      this.broadcastLobby();
    } else if (this.guestChannel?.readyState === "open") {
      this.guestChannel.send(JSON.stringify({ type: "release" }));
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
    } else if (this.guestChannel?.readyState === "open") {
      this.guestChannel.send(JSON.stringify({ type: "pose", pose }));
    }
  }

  sendGameEvent(event: Omit<NetworkGameEvent, "sourceClientId">): void {
    const state = useMultiplayerStore.getState();
    if (!state.room.id || !state.clientId) return;
    if (state.isHost) {
      const withSource = { ...event, sourceClientId: state.clientId } as NetworkGameEvent;
      this.broadcast({ type: "game-event", event: withSource });
      for (const listener of this.eventListeners) listener(withSource);
    } else if (this.guestChannel?.readyState === "open") {
      this.guestChannel.send(JSON.stringify({ type: "game-event", event }));
    }
  }

  onGameEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }
}

export const multiplayerClient = new MultiplayerClient();
