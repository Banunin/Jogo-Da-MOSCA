import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Crown, LockKeyhole, MapPinned, RadioTower, Users } from "lucide-react";
import { MAPS } from "@/game/maps";
import { multiplayerClient, type MultiplayerSlotId, useMultiplayerStore } from "@/game/multiplayer";
import { GAME_MODES, missionUnlocked, missionsFor, type GameModeId } from "@/game/scenarios";
import { STAGES, useGameStore } from "@/game/store";

const SLOT_LABELS: Record<MultiplayerSlotId, string> = {
  "fly-1": "Mosca 1",
  "fly-2": "Mosca 2",
  "fly-3": "Mosca 3",
  "fly-4": "Mosca 4",
  "human-1": "Humano",
};

type EntryMode = "menu" | "solo" | "multiplayer";
type RoomAction = "create" | "join";

export function StartScreen() {
  const start = useGameStore((s) => s.start);
  const selectedMap = useGameStore((s) => s.selectedMap);
  const selectedMode = useGameStore((s) => s.selectedMode);
  const selectedMissionId = useGameStore((s) => s.selectedMissionId);
  const completedStages = useGameStore((s) => s.completedStages);
  const completedMissions = useGameStore((s) => s.completedMissions);
  const setSelectedMap = useGameStore((s) => s.setSelectedMap);
  const setSelectedMode = useGameStore((s) => s.setSelectedMode);
  const setSelectedMission = useGameStore((s) => s.setSelectedMission);

  const [entryMode, setEntryMode] = useState<EntryMode>("menu");
  const [roomAction, setRoomAction] = useState<RoomAction>("create");
  const [name, setName] = useState(() => localStorage.getItem("musca-player-name") ?? "Jogador");
  const [roomName, setRoomName] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const mp = useMultiplayerStore();

  const soloModes = useMemo(() => GAME_MODES.filter((mode) => mode.id !== "multiplayer"), []);
  const customMissions = missionsFor(selectedMap, selectedMode);
  const legacyStages = selectedMode === "campaign" && selectedMap === "bedroom" ? STAGES : [];
  const selectedLegacy = legacyStages.find((stage) => stage.id === selectedMissionId);
  const selectedCustom = customMissions.find((mission) => mission.id === selectedMissionId);

  useEffect(() => {
    if (!mp.room.id) return;
    setSelectedMode("multiplayer");
    if (mp.room.mapId && MAPS.some((map) => map.id === mp.room.mapId)) setSelectedMap(mp.room.mapId);
  }, [mp.room.id, mp.room.mapId, setSelectedMap, setSelectedMode]);

  const savePlayerName = () => {
    const clean = name.trim().slice(0, 24) || "Jogador";
    setName(clean);
    localStorage.setItem("musca-player-name", clean);
    return clean;
  };

  const enterSolo = () => {
    multiplayerClient.leaveRoom();
    multiplayerClient.disconnect();
    if (selectedMode === "multiplayer") setSelectedMode("campaign");
    setEntryMode("solo");
  };

  const enterMultiplayer = () => {
    setEntryMode("multiplayer");
    setSelectedMode("multiplayer");
  };

  const backToMenu = () => {
    if (entryMode === "multiplayer") {
      multiplayerClient.leaveRoom();
      multiplayerClient.disconnect();
    }
    setEntryMode("menu");
  };

  const chooseMode = (mode: GameModeId) => {
    if (mode === "multiplayer") return;
    setSelectedMode(mode);
  };

  const createRoom = () => {
    const clean = savePlayerName();
    multiplayerClient.createRoom(roomName, roomPassword, clean, selectedMap);
  };

  const joinRoom = () => {
    const clean = savePlayerName();
    multiplayerClient.joinRoom(roomName, roomPassword, clean);
  };

  const chooseRole = (slotId: MultiplayerSlotId) => multiplayerClient.claim(slotId, savePlayerName());
  const canSubmitRoom = roomName.trim().length >= 2 && roomPassword.length >= 1 && mp.status !== "connecting";

  return (
    <div className="start-screen hud-layer beta-start-screen">
      <div className={"start-card beta-start-card " + (entryMode === "menu" ? "classic-opening" : "session-opening")}>
        <div className="opening-header">
          {entryMode !== "menu" && <button type="button" className="icon-back" onClick={backToMenu} aria-label="Voltar"><ArrowLeft /></button>}
          <div>
            <p className="kicker">SIMULADOR DE MOSCA · BETA</p>
            <h1 className="display">MUSCA</h1>
            <p className="start-intro">
              Entre em ambientes humanos na escala de uma mosca. Explore, sobreviva, complete missões e jogue com seus amigos.
            </p>
          </div>
        </div>

        <label className="opening-name-field">
          <span>Seu nome</span>
          <input maxLength={24} value={name} onChange={(e) => setName(e.target.value)} onBlur={savePlayerName} placeholder="Jogador" />
        </label>

        {entryMode === "menu" && <>
          <div className="opening-choice-grid">
            <button type="button" className="opening-choice" onClick={enterSolo}>
              <span className="opening-choice-icon">01</span>
              <strong>Jogar solo</strong>
              <small>Campanha, exploração, sobrevivência e desafios. Escolha mapa, modo e missão antes de entrar.</small>
            </button>
            <button type="button" className="opening-choice" onClick={enterMultiplayer}>
              <Users className="opening-choice-svg" />
              <strong>Multiplayer</strong>
              <small>Crie uma sala protegida por senha ou conecte-se a uma sala existente diretamente pelo site.</small>
            </button>
          </div>
          <p className="opening-footnote">Nenhum programa multiplayer separado é necessário para quem estiver jogando pelo site.</p>
        </>}

        {entryMode === "solo" && <div className="session-builder">
          <section className="session-section">
            <div className="session-heading"><span>01</span><div><strong>Mapa</strong><small>Ambiente, perigos e pontos de interesse.</small></div></div>
            <div className="session-map-grid">
              {MAPS.map((map) => <button key={map.id} type="button" className={"session-map-card " + (selectedMap === map.id ? "active" : "")} onClick={() => setSelectedMap(map.id)}>
                <img src={map.preview} alt="" />
                <span><strong>{map.name}</strong><small>{map.difficulty} · {map.subtitle}</small></span>
                {selectedMap === map.id && <Check className="size-4" />}
              </button>)}
            </div>
          </section>

          <section className="session-section">
            <div className="session-heading"><span>02</span><div><strong>Modo</strong><small>O modo define regras, pressão e objetivos da sessão.</small></div></div>
            <div className="mode-grid">
              {soloModes.map((mode) => <button key={mode.id} type="button" className={"mode-card " + (selectedMode === mode.id ? "active" : "")} onClick={() => chooseMode(mode.id)}>
                <strong>{mode.name}</strong><small>{mode.description}</small><em>Risco · {mode.danger}</em>
              </button>)}
            </div>
          </section>

          <section className="session-section">
            <div className="session-heading"><span>03</span><div><strong>Missão</strong><small>Objetivos variados, progressão e desbloqueios persistentes.</small></div></div>
            <div className="mission-picker">
              {legacyStages.map((stage, index) => {
                const unlocked = index === 0 || completedStages.includes(legacyStages[index - 1]!.id) || completedStages.includes(stage.id);
                const done = completedStages.includes(stage.id);
                return <button key={stage.id} disabled={!unlocked} type="button" className={"mission-row " + (selectedMissionId === stage.id ? "active" : "")} onClick={() => setSelectedMission(stage.id)}>
                  <span className="mission-index">{String(stage.number).padStart(2, "0")}</span><span><strong>{stage.name}</strong><small>{stage.objectives.filter((o) => !o.optional).length} objetivos principais</small></span>{done ? <Check className="size-4" /> : !unlocked ? <LockKeyhole className="size-4" /> : null}
                </button>;
              })}
              {customMissions.map((mission) => {
                const unlocked = missionUnlocked(mission, completedMissions, completedStages);
                const done = completedMissions.includes(mission.id);
                return <button key={mission.id} disabled={!unlocked} type="button" className={"mission-row " + (selectedMissionId === mission.id ? "active" : "")} onClick={() => setSelectedMission(mission.id)}>
                  <span className="mission-index">{String(mission.order).padStart(2, "0")}</span><span><strong>{mission.name}</strong><small>{mission.objectives.length} objetivos · {mission.description}</small></span>{done ? <Check className="size-4" /> : !unlocked ? <LockKeyhole className="size-4" /> : null}
                </button>;
              })}
              {!legacyStages.length && !customMissions.length && <p className="empty-missions">Este modo ainda não possui missões neste mapa.</p>}
            </div>
            {(selectedLegacy || selectedCustom) && <div className="selected-mission-detail">
              <span>SELECIONADA</span><strong>{selectedLegacy?.name ?? selectedCustom?.name}</strong>
              <small>{selectedLegacy?.intro ?? selectedCustom?.description}</small>
              <div className="mission-objective-preview">
                {(selectedLegacy?.objectives.filter((objective) => !objective.optional) ?? selectedCustom?.objectives ?? []).map((objective) => <span key={objective.id}>• {objective.label}</span>)}
              </div>
            </div>}
          </section>

          <div className="start-actions">
            <div><MapPinned className="size-4" /><span>{MAPS.find((map) => map.id === selectedMap)?.name} · {GAME_MODES.find((mode) => mode.id === selectedMode)?.name}</span></div>
            <button type="button" className="btn btn-primary" disabled={!selectedMissionId} onClick={() => { savePlayerName(); start(); }}>Jogar solo</button>
          </div>
        </div>}

        {entryMode === "multiplayer" && <div className="multiplayer-site-flow">
          {!mp.room.id ? <>
            <div className="room-action-tabs" role="tablist" aria-label="Opções multiplayer">
              <button type="button" className={roomAction === "create" ? "active" : ""} onClick={() => setRoomAction("create")}>Criar sala</button>
              <button type="button" className={roomAction === "join" ? "active" : ""} onClick={() => setRoomAction("join")}>Conectar a uma sala</button>
            </div>

            {roomAction === "create" && <section className="session-section room-config-section">
              <div className="session-heading"><span>01</span><div><strong>Criar sala</strong><small>Você será identificado como anfitrião da sessão.</small></div></div>
              <div className="room-fields">
                <label><span>Nome da sala</span><input maxLength={32} value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Ex.: Quarto do João" autoComplete="off" /></label>
                <label><span>Senha</span><input maxLength={64} type="password" value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)} placeholder="Senha da sala" autoComplete="new-password" /></label>
              </div>
              <div className="session-heading compact"><span>02</span><div><strong>Mapa da sala</strong><small>Quem entrar receberá automaticamente este mapa.</small></div></div>
              <div className="session-map-grid">
                {MAPS.map((map) => <button key={map.id} type="button" className={"session-map-card " + (selectedMap === map.id ? "active" : "")} onClick={() => setSelectedMap(map.id)}>
                  <img src={map.preview} alt="" /><span><strong>{map.name}</strong><small>{map.difficulty} · {map.subtitle}</small></span>{selectedMap === map.id && <Check className="size-4" />}
                </button>)}
              </div>
              <button type="button" className="btn btn-primary room-submit" disabled={!canSubmitRoom} onClick={createRoom}>{mp.status === "connecting" ? "Conectando…" : "Criar sala"}</button>
            </section>}

            {roomAction === "join" && <section className="session-section room-config-section">
              <div className="session-heading"><span>01</span><div><strong>Entrar em sala</strong><small>Use exatamente o nome e a senha informados pelo anfitrião.</small></div></div>
              <div className="room-fields">
                <label><span>Nome da sala</span><input maxLength={32} value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Nome da sala" autoComplete="off" /></label>
                <label><span>Senha</span><input maxLength={64} type="password" value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)} placeholder="Senha da sala" autoComplete="current-password" /></label>
              </div>
              <button type="button" className="btn btn-primary room-submit" disabled={!canSubmitRoom} onClick={joinRoom}>{mp.status === "connecting" ? "Conectando…" : "Conectar"}</button>
            </section>}
            {mp.error && <p className="multiplayer-error room-error">{mp.error}</p>}
            <p className="section-note web-multiplayer-note"><RadioTower className="size-4" /> O site usa o próprio endereço para conectar ao multiplayer (`/ws`), inclusive em HTTPS/WSS. Não há porta separada para o jogador configurar.</p>
          </> : <section className="session-section multiplayer-lobby site-room-lobby">
            <div className="room-title-line">
              <div><small>SALA</small><strong>{mp.room.name}</strong><span>{MAPS.find((map) => map.id === mp.room.mapId)?.name ?? mp.room.mapId}</span></div>
              {mp.room.hostClientId === mp.clientId && <span className="host-badge"><Crown className="size-4" /> Anfitrião</span>}
            </div>
            <div className="multiplayer-connection"><span className={"status-dot " + mp.status} /><strong>{mp.status === "connected" ? "Sala conectada" : mp.status === "connecting" ? "Conectando…" : "Conexão perdida"}</strong></div>
            {mp.error && <p className="multiplayer-error">{mp.error}</p>}
            <div className="role-grid">
              {mp.slots.map((slot) => {
                const mine = slot.ownerId === mp.clientId;
                const occupied = !!slot.ownerId && !mine;
                return <button key={slot.slotId} className={"role-card " + (mine ? "mine" : "")} disabled={mp.status !== "connected" || occupied} onClick={() => chooseRole(slot.slotId)}>
                  <strong>{SLOT_LABELS[slot.slotId]}</strong><small>{mine ? "Selecionado por você" : occupied ? `Ocupado · ${slot.ownerName ?? "Jogador"}` : "Disponível"}</small>
                </button>;
              })}
            </div>
            <div className="room-lobby-actions">
              <button type="button" className="btn btn-primary" disabled={!mp.role} onClick={() => { savePlayerName(); start(); }}>{mp.role ? `Jogar como ${SLOT_LABELS[mp.role]}` : "Escolha um personagem"}</button>
              <button type="button" className="btn btn-ghost" onClick={() => multiplayerClient.leaveRoom()}>Sair da sala</button>
            </div>
          </section>}
        </div>}
      </div>
    </div>
  );
}
