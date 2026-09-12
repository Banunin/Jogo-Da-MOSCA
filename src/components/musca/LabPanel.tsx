import { useState } from "react";
import { Check, Pause, Play, RotateCcw, Trash2, X } from "lucide-react";
import { BRAIN_MODULES, MODULE_LABELS } from "@/game/types";
import type { BrainModuleId, ControlAction } from "@/game/types";
import { CONTROL_LABELS, CONTROL_PRESETS, DEFAULT_SETTINGS, keyName } from "@/game/settings";
import { FLY_UPGRADES, STAGES, TASKS, upgradeCost, useGameStore, type FlyUpgradeId, type LabTab } from "@/game/store";
import { NeuralFlow } from "./NeuralFlow";

const TABS: Array<[LabTab, string]> = [
  ["brain", "Cérebro"], ["tasks", "Fases"], ["memory", "Memória"],
  ["sensors", "Sensores"], ["profiles", "Perfis"], ["upgrades", "Evolução"], ["settings", "Configurações"],
];

function ModuleRow({ id, value, onChange }: { id: BrainModuleId; value: number; onChange: (v: number) => void }) {
  const pct = Math.round(value * 100);
  return (
    <label className="module-row">
      <span>{MODULE_LABELS[id]}</span><strong>{pct}%</strong>
      <input className="slider" type="range" min={0} max={100} step={25} value={pct}
        onChange={(e) => onChange(Number(e.target.value) / 100)} aria-label={MODULE_LABELS[id]} />
    </label>
  );
}

function BrainTab() {
  const snapshot = useGameStore((s) => s.snapshot);
  const setModule = useGameStore((s) => s.setModule);
  return (
    <div className="lab-grid">
      <section className="lab-section">
        <h3>Módulos</h3>
        <p className="section-note">0% desativa. 25% limita. A alteração entra na próxima leitura do mundo.</p>
        <div className="module-list">{BRAIN_MODULES.map((id) =>
          <ModuleRow key={id} id={id} value={snapshot.modules[id]} onChange={(v) => setModule(id, v)} />)}
        </div>
      </section>
      <section className="lab-section">
        <h3>Ciclo atual</h3>
        <NeuralFlow snapshot={snapshot} />
        <dl className="facts">
          <div><dt>Estado</dt><dd>{snapshot.state.replaceAll("_", " ")}</dd></div>
          <div><dt>Pensamento</dt><dd>{snapshot.thought}</dd></div>
          <div><dt>Destino</dt><dd>{snapshot.destination?.label ?? "Nenhum"}</dd></div>
        </dl>
      </section>
    </div>
  );
}

function TasksTab() {
  const progression = useGameStore((s) => s.progression);
  const completedStages = useGameStore((s) => s.completedStages);
  const foundSecrets = useGameStore((s) => s.foundSecrets);
  const runtime = useGameStore((s) => s.taskRuntime);
  const restartStage = useGameStore((s) => s.restartStage);
  const reset = useGameStore((s) => s.resetProgress);
  const stage = STAGES[progression.stageIndex]!;
  return (
    <div className="lab-grid stages-grid">
      <section className="lab-section">
        <div className="section-title"><div><h3>Fase {stage.number}: {stage.name}</h3><p className="section-note">{stage.intro}</p></div>
          <button className="btn btn-ghost" onClick={restartStage}><RotateCcw className="size-4" /> Reiniciar fase</button></div>
        <div className="stage-meta"><span>TIPO · {stage.type.toUpperCase()}</span><span>MECÂNICAS · {stage.mechanics.join(" · ")}</span></div>
        <div className="task-list">{stage.objectives.map((objective, index) => {
          const done = objective.optional ? progression.optionalDone.includes(objective.id) : progression.objectiveDone.includes(objective.id);
          return <article key={objective.id} className={"task-card " + (done ? "done" : "active")}>
            <span className="task-number">{done ? <Check className="size-4" /> : String(index + 1).padStart(2, "0")}</span>
            <div><h4>{objective.label}{objective.optional ? " · opcional" : ""}</h4><p>{objective.description}</p></div>
          </article>;
        })}</div>
        <h3 className="subheading">Progressão</h3>
        <div className="phase-strip">{STAGES.map((item) => {
          const done = completedStages.includes(item.id);
          const active = item.id === stage.id;
          return <div key={item.id} className={done ? "done" : active ? "active" : ""}><b>{item.number}</b><span>{item.name}</span></div>;
        })}</div>
      </section>
      <section className="lab-section">
        <h3>Coleção · Segredos</h3>
        <p className="section-note">O jogo registra descobertas, mas não revela onde procurar.</p>
        <div className="secrets-grid">{["pc-message", "under-bed-token", "wardrobe-note", "shelf-web", "window-mark"].map((id, index) => {
          const found = foundSecrets.includes(id);
          return <div key={id} className={found ? "secret-found" : ""}><span>{found ? "✓ Encontrado" : "???"}</span><small>Segredo {String(index + 1).padStart(2, "0")}</small></div>;
        })}</div>
        <h3 className="subheading">Experimentos do laboratório</h3>
        <p className="section-note">Os testes originais continuam disponíveis e são independentes das fases.</p>
        <div className="task-list compact">{TASKS.map((task, index) => {
          const done = runtime.completed.includes(task.id);
          return <article key={task.id} className={"task-card " + (done ? "done" : "")}>
            <span className="task-number">{done ? <Check className="size-4" /> : String(index + 1).padStart(2, "0")}</span>
            <div><h4>{task.title}</h4><p>{task.instruction}</p></div>
          </article>;
        })}</div>
        <button className="btn btn-ghost" onClick={reset}><RotateCcw className="size-4" /> Zerar experimentos</button>
      </section>
    </div>
  );
}

function MemoryTab() {
  const memories = useGameStore((s) => s.snapshot.memories);
  return <section className="lab-section"><h3>Memória espacial</h3>
    <p className="section-note">Registros perdem força com o tempo. Memória baixa acelera o esquecimento.</p>
    {memories.length === 0 ? <div className="empty-state">Nenhum local registrado.</div> :
      <div className="data-list">{memories.map((m) => <div key={m.id} className="data-row">
        <span className={"memory-mark " + m.kind} /><div><strong>{m.kind === "food" ? "Alimento" : m.kind === "danger" ? "Perigo" : "Local seguro"}</strong>
        <small>X {m.x.toFixed(1)} · Y {m.y.toFixed(1)} · Z {m.z.toFixed(1)}</small></div>
        <span>{Math.round(m.strength * 100)}%</span></div>)}</div>}
  </section>;
}

function SensorsTab() {
  const snapshot = useGameStore((s) => s.snapshot);
  return <section className="lab-section"><h3>Leitura dos sensores</h3>
    <p className="section-note">{snapshot.perceptions.length} sinais dentro do campo de percepção.</p>
    {snapshot.perceptions.length === 0 ? <div className="empty-state">Nada detectado.</div> :
      <div className="data-list">{snapshot.perceptions.map((p) => <div key={p.id} className="data-row">
        <div><strong>{p.label}</strong><small>{p.distance.toFixed(1)} m · movimento {p.motion.toFixed(1)}</small></div>
        <span className={p.danger > .45 ? "text-danger" : ""}>Perigo {Math.round(p.danger * 100)}%</span></div>)}</div>}
    <h3 className="subheading">Comportamento humano</h3>
    <div className="data-list">{snapshot.humans.map((h) => <div key={h.id} className="data-row">
      <div><strong>{h.label}</strong><small>{h.personality} · tentativas {h.attempts}</small></div>
      <span>{h.state.replaceAll("_", " ")}{h.lastResult ? ` · ${h.lastResult}` : ""}</span>
    </div>)}</div>
  </section>;
}

function ProfilesTab() {
  const [name, setName] = useState("");
  const profiles = useGameStore((s) => s.profiles);
  const load = useGameStore((s) => s.loadProfile);
  const save = useGameStore((s) => s.saveProfile);
  const duplicate = useGameStore((s) => s.duplicateProfile);
  const rename = useGameStore((s) => s.renameProfile);
  const remove = useGameStore((s) => s.deleteProfile);
  return <section className="lab-section"><h3>Perfis de mosca</h3>
    <p className="section-note">Um perfil guarda os níveis atuais do cérebro.</p>
    <div className="profile-create"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do perfil" maxLength={32} />
      <button className="btn btn-primary" disabled={!name.trim()} onClick={() => { save(name); setName(""); }}>Salvar atual</button></div>
    <div className="data-list">{profiles.map((p) => <div key={p.id} className="data-row">
      <div><strong>{p.name}</strong><small>{p.builtIn ? "Perfil padrão" : "Perfil salvo"}</small></div>
      <div className="row-actions"><button className="btn btn-ghost" onClick={() => load(p.id)}>Carregar</button>
      <button className="btn btn-ghost" onClick={() => duplicate(p.id)}>Duplicar</button>
      {!p.builtIn && <button className="btn btn-ghost" onClick={() => { const next = window.prompt("Novo nome", p.name); if (next) rename(p.id, next); }}>Renomear</button>}
      {!p.builtIn && <button className="icon-btn" aria-label={"Excluir " + p.name} onClick={() => remove(p.id)}><Trash2 className="size-4" /></button>}</div>
    </div>)}</div>
  </section>;
}

function UpgradesTab() {
  const points = useGameStore((s) => s.flyPoints);
  const settings = useGameStore((s) => s.settings);
  const buy = useGameStore((s) => s.buyUpgrade);
  const ids: FlyUpgradeId[] = ["armor", "wings", "reflexes", "metabolism", "platinum"];
  const levelOf = (id: FlyUpgradeId) => id === "platinum" ? (settings.flySkin === "platinum" ? 1 : 0)
    : id === "armor" ? settings.upgradeArmor
    : id === "wings" ? settings.upgradeWings
    : id === "reflexes" ? settings.upgradeReflexes
    : settings.upgradeMetabolism;
  return <div className="lab-grid">
    <section className="lab-section"><h3>Evolução da mosca</h3>
      <p className="section-note">Ganhe pontos jogando: fases, objetivos, segredos, alimentação e ataques evitados. Os bônus abaixo alteram atributos reais da mosca.</p>
      <div className="evolution-points"><span>PONTOS DISPONÍVEIS</span><strong>{points}</strong></div>
      <div className="upgrade-list">{ids.map((id) => {
        const spec = FLY_UPGRADES[id];
        const level = levelOf(id);
        const maxed = level >= spec.max;
        const cost = upgradeCost(id, settings);
        return <div className="upgrade-card" key={id}>
          <div><strong>{spec.name}</strong><small>{spec.description}</small><em>{id === "platinum" ? (maxed ? "DESBLOQUEADA" : "COSMÉTICO") : `Nível ${level}/${spec.max}`}</em></div>
          <button className="btn btn-primary" disabled={maxed || points < cost} onClick={() => buy(id)}>{maxed ? "Máximo" : `${cost} pts`}</button>
        </div>;
      })}</div>
    </section>
    <section className="lab-section"><h3>Como pontuar</h3>
      <div className="data-list">
        <div className="data-row"><div><strong>Concluir fase</strong><small>Recompensa grande</small></div><b>+50</b></div>
        <div className="data-row"><div><strong>Objetivo</strong><small>Principal ou secundário</small></div><b>+8</b></div>
        <div className="data-row"><div><strong>Segredo</strong><small>Exploração recompensada</small></div><b>+20</b></div>
        <div className="data-row"><div><strong>Esquiva</strong><small>Ataque humano evitado</small></div><b>+4</b></div>
        <div className="data-row"><div><strong>Alimento</strong><small>Interação alimentar</small></div><b>+2</b></div>
      </div>
      <p className="section-note">A Platinum 2.0 é visual; os demais upgrades são funcionais. Nada aqui substitui seus controles ou configurações personalizadas.</p>
    </section>
  </div>;
}

function RangeSetting({ label, value, min, max, step, suffix = "", onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (v: number) => void }) {
  return <label className="setting-row"><span>{label}<small>{(suffix === "%" ? value.toFixed(0) : value.toFixed(step < 0.1 ? 3 : 1))}{suffix}</small></span>
    <input className="slider" type="range" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}

function SettingsTab() {
  const settings = useGameStore((s) => s.settings);
  const update = useGameStore((s) => s.updateSettings);
  const bind = useGameStore((s) => s.bindControl);
  const [listening, setListening] = useState<ControlAction | null>(null);
  return <div className="lab-grid">
    <section className="lab-section"><h3>Voo e câmera</h3>
      <div className="preset-row"><span>Presets</span>
        <button className="btn btn-ghost" onClick={() => update(CONTROL_PRESETS.default)}>Padrão</button>
        <button className="btn btn-ghost" onClick={() => update(CONTROL_PRESETS.precise)}>Preciso</button>
        <button className="btn btn-ghost" onClick={() => update(CONTROL_PRESETS.easy)}>Fácil</button>
        <span className="preset-custom">Personalizado ao alterar qualquer ajuste</span></div>
      <RangeSetting label="Sensibilidade" value={settings.sensitivity} min={.0008} max={.006} step={.0002} onChange={(v) => update({ sensitivity: v })} />
      <RangeSetting label="Velocidade" value={settings.speed} min={.6} max={1.6} step={.1} suffix="x" onChange={(v) => update({ speed: v })} />
      <RangeSetting label="Aceleração" value={settings.acceleration} min={.5} max={1.7} step={.1} suffix="x" onChange={(v) => update({ acceleration: v })} />
      <RangeSetting label="Imersão e vibração da câmera" value={settings.cameraIntensity} min={0} max={1} step={.1} onChange={(v) => update({ cameraIntensity: v })} />
      <p className="section-note">A câmera reage à velocidade, aceleração e curvas. Coloque a intensidade em zero para desativar a vibração e a abertura dinâmica do campo de visão.</p>
      <RangeSetting label="Distância da 3ª pessoa" value={settings.thirdPersonDistance} min={1.4} max={5.0} step={.1} suffix=" m" onChange={(v) => update({ thirdPersonDistance: v })} />
      <RangeSetting label="Altura da 3ª pessoa" value={settings.thirdPersonHeight} min={.35} max={2.0} step={.05} suffix=" m" onChange={(v) => update({ thirdPersonHeight: v })} />
      <p className="section-note">Na 3ª pessoa: mova o mouse ou arraste por toque para orbitar e use a roda/botões de zoom para aproximar ou afastar.</p>
      <label className="toggle-row"><span>Inverter eixo Y</span><input type="checkbox" checked={settings.invertY} onChange={(e) => update({ invertY: e.target.checked })} /></label>
      <label className="toggle-row"><span>Assistência contra vento</span><input type="checkbox" checked={settings.flightAssist} onChange={(e) => update({ flightAssist: e.target.checked })} /></label>
      <label className="select-row"><span>Dificuldade</span><select value={settings.difficulty} onChange={(e) => update({ difficulty: e.target.value as typeof settings.difficulty })}>
        <option value="easy">Fácil</option><option value="normal">Normal</option><option value="hard">Difícil</option></select></label>
      <p className="section-note">Dificuldade altera fome, força do vento e reação dos humanos.</p>
      <h3 className="subheading">Áudio</h3>
      <RangeSetting label="Volume geral" value={settings.masterVolume * 100} min={0} max={150} step={5} suffix="%" onChange={(v) => { window.__muscaSim?.unlockAudio(); update({ masterVolume: v / 100 }); }} />
      <RangeSetting label="Efeitos" value={settings.effectsVolume * 100} min={0} max={150} step={5} suffix="%" onChange={(v) => { window.__muscaSim?.unlockAudio(); update({ effectsVolume: v / 100 }); }} />
      <RangeSetting label="Zumbido da mosca" value={settings.buzzVolume * 100} min={0} max={150} step={5} suffix="%" onChange={(v) => { window.__muscaSim?.unlockAudio(); update({ buzzVolume: v / 100 }); }} />
      <div className="preset-row">
        <button className="btn btn-ghost" onClick={() => window.__muscaSim?.testAudio()}>Testar som</button>
        <button className="btn btn-ghost" onClick={() => update({ masterVolume: DEFAULT_SETTINGS.masterVolume, effectsVolume: DEFAULT_SETTINGS.effectsVolume, buzzVolume: DEFAULT_SETTINGS.buzzVolume })}>Restaurar áudio padrão</button>
      </div>
      <p className="section-note">Os volumes ficam salvos neste navegador. Use 0% para silenciar; acima de 100% há amplificação adicional.</p>
      <h3 className="subheading">Inteligência artificial</h3>
      <RangeSetting label="Inteligência dos NPCs" value={settings.aiIntelligence} min={.65} max={1.5} step={.05} suffix="x" onChange={(v) => update({ aiIntelligence: v })} />
      <p className="section-note">Inteligência altera percepção, previsão, busca e navegação dos NPCs sem dar visão através de paredes.</p>
      <h3 className="subheading">Visual</h3>
      <label className="toggle-row"><span>Sombras</span><input type="checkbox" checked={settings.shadows} onChange={(e) => update({ shadows: e.target.checked })} /></label>
      <label className="toggle-row"><span>Partículas de ar</span><input type="checkbox" checked={settings.particles} onChange={(e) => update({ particles: e.target.checked })} /></label>
      <RangeSetting label="Distância visível" value={settings.renderDistance} min={12} max={32} step={2} suffix=" m" onChange={(v) => update({ renderDistance: v })} />
      <RangeSetting label="Escala de renderização" value={settings.renderScale} min={.65} max={1.45} step={.05} suffix="x" onChange={(v) => update({ renderScale: v })} />
      <RangeSetting label="Exposição" value={settings.exposure} min={.75} max={1.55} step={.05} suffix="x" onChange={(v) => update({ exposure: v })} />
      <h3 className="subheading">Moscas e sobrevivência</h3>
      <RangeSetting label="HP máximo" value={settings.maxHp} min={40} max={250} step={10} onChange={(v) => update({ maxHp: v })} />
      <RangeSetting label="Dano recebido" value={settings.damageMultiplier} min={.35} max={2} step={.05} suffix="x" onChange={(v) => update({ damageMultiplier: v })} />
      <RangeSetting label="Tamanho da sua mosca" value={settings.playerFlyScale} min={.55} max={1.25} step={.05} suffix="x" onChange={(v) => update({ playerFlyScale: v })} />
      <RangeSetting label="Tamanho das moscas livres" value={settings.ambientFlyScale} min={.35} max={1.05} step={.05} suffix="x" onChange={(v) => update({ ambientFlyScale: v })} />
      <RangeSetting label="Velocidade das moscas livres" value={settings.ambientFlySpeed} min={.65} max={2} step={.05} suffix="x" onChange={(v) => update({ ambientFlySpeed: v })} />
      <RangeSetting label="Agilidade das moscas livres" value={settings.ambientFlyAgility} min={.65} max={2.2} step={.05} suffix="x" onChange={(v) => update({ ambientFlyAgility: v })} />
      <p className="section-note">Esses ajustes alteram apenas escala, sobrevivência e comportamento das moscas. Missões, câmera e progressão permanecem intactas.</p>
    </section>
    <section className="lab-section"><h3>Controles</h3><p className="section-note">Clique numa tecla e pressione a substituta. Tab fica reservado às configurações; Esc fica reservado ao cursor.</p>
      <div className="binding-list">{(Object.keys(CONTROL_LABELS) as ControlAction[]).filter((action) => action !== "laboratory").map((action) =>
        <div className="binding-row" key={action}><span>{CONTROL_LABELS[action]}</span>
          <button className={"key-button " + (listening === action ? "listening" : "")}
            onClick={() => setListening(action)}
            onKeyDown={(e) => { if (listening !== action) return; e.preventDefault(); e.stopPropagation(); bind(action, e.code); setListening(null); }}>
            {listening === action ? "Pressione..." : keyName(settings.bindings[action])}</button></div>)}</div>
    </section>
  </div>;
}

export function LabPanel() {
  const tab = useGameStore((s) => s.labTab);
  const setTab = useGameStore((s) => s.setLabTab);
  const close = useGameStore((s) => s.setLabOpen);
  const paused = useGameStore((s) => s.paused);
  const setPaused = useGameStore((s) => s.setPaused);
  const timeScale = useGameStore((s) => s.timeScale);
  const setTimeScale = useGameStore((s) => s.setTimeScale);
  const reset = useGameStore((s) => s.resetSimulation);
  return <div className="lab-shell">
    <aside className="lab-nav panel">
      <div className="lab-brand"><span>LABORATÓRIO</span><strong>MUSCA / 01</strong></div>
      <nav>{TABS.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}</nav>
      <button className="btn btn-ghost lab-close" onClick={() => close(false)}><X className="size-4" /> Jogar</button>
    </aside>
    <main className="lab-main panel">
      <header className="sim-toolbar">
        <div><span>SIMULAÇÃO</span><strong>{paused ? "PAUSADA" : "EXECUTANDO"}</strong></div>
        <button className="btn btn-ghost" onClick={() => setPaused(!paused)}>{paused ? <Play className="size-4" /> : <Pause className="size-4" />}{paused ? "Continuar" : "Pausar"}</button>
        <div className="speed-group">{[.25, 1, 2, 4].map((v) => <button key={v} className={timeScale === v ? "active" : ""} onClick={() => setTimeScale(v)}>{v}x</button>)}</div>
        <button className="btn btn-ghost" onClick={reset}><RotateCcw className="size-4" /> Reiniciar</button>
      </header>
      <div className="lab-content">
        {tab === "brain" && <BrainTab />}{tab === "tasks" && <TasksTab />}
        {tab === "memory" && <MemoryTab />}{tab === "sensors" && <SensorsTab />}
        {tab === "profiles" && <ProfilesTab />}{tab === "upgrades" && <UpgradesTab />}{tab === "settings" && <SettingsTab />}
      </div>
    </main>
  </div>;
}
