import type {
  BrainModuleId,
  EntityKind,
  FlyState,
  MemoryKind,
  MemoryTrace,
  Needs,
  Perception,
  Personality,
  Vec3,
} from "./types";
import { BRAIN_MODULES, KIND_LABELS } from "./types";
import { clamp, dist, dist2, forwardFromYaw, rand, vec, yawTo } from "./math";

export function fullModules(): Record<BrainModuleId, number> {
  const modules = {} as Record<BrainModuleId, number>;
  for (const id of BRAIN_MODULES) modules[id] = 1;
  return modules;
}

export function freshNeeds(): Needs {
  return {
    hunger: 35 + rand(0, 25),
    energy: 70 + rand(0, 25),
    fear: 8,
    curiosity: 40 + rand(0, 30),
    stress: 10,
  };
}

let memSeq = 1;

export interface Sensable {
  id: string;
  kind: EntityKind;
  pos: Vec3;
  vel: Vec3;
  radius: number;
  edible?: boolean;
  amount?: number;
}

export class Mind {
  needs: Needs;
  memories: MemoryTrace[] = [];
  state: FlyState = "EXPLORANDO";
  target: Vec3 | null = null;
  targetLabel = "explorar";
  perceptions: Perception[] = [];
  detected: Perception | null = null;
  thought = "O mundo cheira a algo doce.";
  wander: Vec3 = vec();
  wanderTimer = 0;
  eatTimer = 0;
  restTimer = 0;
  panicTimer = 0;

  constructor(
    public personality: Personality,
    public modules: Record<BrainModuleId, number>,
  ) {
    this.needs = freshNeeds();
    this.wander = vec(rand(-6, 6), 2.4, rand(-4, 4));
  }

  m(id: BrainModuleId): number {
    return this.modules[id] ?? 1;
  }

  remember(kind: MemoryKind, pos: Vec3, strength = 1): void {
    if (this.m("memory") <= 0.05) return;
    const existing = this.memories.find((mem) => mem.kind === kind && dist2(mem, pos) < 1.2 * 1.2);
    if (existing) {
      existing.strength = Math.max(existing.strength, strength);
      existing.age = 0;
      existing.x = pos.x;
      existing.y = pos.y;
      existing.z = pos.z;
      return;
    }
    this.memories.push({
      id: `m${memSeq++}`,
      kind,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      strength,
      age: 0,
    });
    if (this.memories.length > 8) this.memories.shift();
  }

  sense(self: { pos: Vec3; yaw: number; pitch: number; vel: Vec3 }, others: Sensable[]): void {
    const vision = this.m("vision");
    const attention = this.m("attention");
    const perception = this.m("perception");
    const range = 1.2 + 9 * vision * (0.45 + 0.55 * attention);
    const halfFov = (0.35 + 1.25 * vision) * (0.5 + 0.5 * attention);
    const fwd = forwardFromYaw(self.yaw, self.pitch * 0.35);
    const list: Perception[] = [];

    for (const other of others) {
      const dx = other.pos.x - self.pos.x;
      const dy = other.pos.y - self.pos.y;
      const dz = other.pos.z - self.pos.z;
      const d = Math.hypot(dx, dy, dz);
      if (d < 0.01 || d > range) continue;
      const ndot = (dx * fwd.x + dy * fwd.y + dz * fwd.z) / d;
      const ang = Math.acos(clamp(ndot, -1, 1));
      if (ang > halfFov && vision < 0.95) continue;

      const speed = Math.hypot(other.vel.x, other.vel.y, other.vel.z);
      let danger = 0;
      if (other.kind === "spider") danger = clamp(1.1 - d / 3.2, 0, 1) * 0.95;
      else if (other.kind === "human") danger = clamp(0.9 - d / 7, 0, 1) * 0.7 + speed * 0.08;
      else if (other.kind === "fan") danger = clamp(0.7 - d / 3.5, 0, 1) * 0.55;
      else if (other.kind === "vacuum") danger = clamp(1 - d / 3.8, 0, 1) * 0.8;
      else if (other.kind === "fire") danger = clamp(1 - d / 2.4, 0, 1) * 0.9;
      else if (other.kind === "water") danger = clamp(0.55 - d / 2.2, 0, 1) * 0.4;
      danger *= 0.35 + 0.65 * perception;
      if (speed > 1.4) danger = Math.min(1, danger + 0.15 * perception);

      list.push({
        id: other.id,
        kind: other.kind,
        label: KIND_LABELS[other.kind],
        distance: d,
        motion: speed,
        danger,
        x: other.pos.x,
        y: other.pos.y,
        z: other.pos.z,
      });
    }

    list.sort((a, b) => b.danger - a.danger || a.distance - b.distance);
    this.perceptions = list.slice(0, 8);
    this.detected = this.perceptions[0] ?? null;
  }

  tickNeeds(dt: number, flying: boolean): void {
    const feed = this.m("feeding");
    const fearM = this.m("fear");
    this.needs.hunger = clamp(this.needs.hunger + dt * (2.4 + (1 - feed) * 0.6), 0, 100);
    const drain = flying ? 4.2 / (0.4 + this.personality.stamina) : 0.7;
    this.needs.energy = clamp(this.needs.energy - drain * dt, 0, 100);
    if (!flying) this.needs.energy = clamp(this.needs.energy + dt * 6.5, 0, 100);

    const top = this.perceptions[0];
    const threat = top ? top.danger * 100 * (0.25 + 0.75 * fearM) : 0;
    this.needs.fear = clamp(
      this.needs.fear + (threat - this.needs.fear) * Math.min(1, dt * (2.8 + this.m("attention") * 2)),
      0,
      100,
    );
    if (!top || top.danger < 0.12) {
      this.needs.fear = clamp(this.needs.fear - dt * 12, 0, 100);
    }

    this.needs.curiosity = clamp(
      this.needs.curiosity + dt * (this.personality.curious * 3 - 1.2) - this.needs.fear * 0.02 * dt,
      0,
      100,
    );
    this.needs.stress = clamp(
      this.needs.stress * (1 - dt * 0.25) + this.needs.fear * 0.35 * dt,
      0,
      100,
    );
    if (this.needs.hunger > 80) this.needs.stress = clamp(this.needs.stress + dt * 4, 0, 100);

    const fade = 0.08 + (1 - this.m("memory")) * 0.7;
    for (const mem of this.memories) {
      mem.age += dt;
      mem.strength = Math.max(0, mem.strength - fade * dt);
    }
    this.memories = this.memories.filter((m) => m.strength > 0.05);
  }

  decide(self: { pos: Vec3; yaw: number }, dt: number, autonomous = true): FlyState {
    const c = this.m("consciousness");
    const fearM = this.m("fear");
    const nav = this.m("navigation");
    const feed = this.m("feeding");

    if (c < 0.2 && Math.random() < 0.35 * dt * 8) {
      this.state = "DESORIENTADA";
      this.thought = "Tudo se mistura. Onde é cima?";
      this.target = vec(self.pos.x + rand(-2, 2), self.pos.y + rand(-0.4, 0.6), self.pos.z + rand(-2, 2));
      this.targetLabel = "lugar nenhum";
      return this.state;
    }

    const threat = this.perceptions.find((p) => p.danger > 0.34);
    const food = this.perceptions.find((p) => p.kind === "food");
    const hunger = this.needs.hunger;
    const energy = this.needs.energy;
    const fear = this.needs.fear;

    if (this.panicTimer > 0) this.panicTimer -= dt;

    if (threat && fearM > 0.08 && (fear > 28 || threat.danger > 0.55)) {
      this.state = "FUGINDO";
      this.panicTimer = 1.4;
      const away = vec(
        self.pos.x - (threat.x - self.pos.x) * 2.4,
        Math.max(1.2, self.pos.y + 0.8),
        self.pos.z - (threat.z - self.pos.z) * 2.4,
      );
      const safe = this.bestMemory("safe");
      this.target = safe && fearM > 0.4 ? vec(safe.x, safe.y, safe.z) : away;
      this.targetLabel = safe ? "local seguro" : "longe da ameaça";
      this.thought = `Perigo: ${threat.label}. Fugir.`;
      this.remember("danger", { x: threat.x, y: threat.y, z: threat.z }, 1);
      return this.state;
    }

    if (threat && threat.danger > 0.22) {
      this.state = "ALERTA";
      this.thought = `${threat.label} em movimento. Atenção.`;
    }

    if (this.eatTimer > 0) {
      this.eatTimer -= dt;
      this.state = "COMENDO";
      this.thought = "Açúcar. Calor. Continuar.";
      this.targetLabel = "comida";
      return this.state;
    }

    if (food && hunger > 28 * (1.1 - feed * 0.3) && feed > 0.05) {
      if (food.distance < 0.38) {
        if (!autonomous) {
          this.state = "ALERTA";
          this.target = vec(food.x, food.y, food.z);
          this.targetLabel = "comida ao alcance";
          this.thought = "Comida ao alcance. Pressione F.";
          return this.state;
        }
        this.state = "COMENDO";
        this.eatTimer = 1.6 / (0.4 + feed);
        this.needs.hunger = clamp(this.needs.hunger - 28 * feed, 0, 100);
        this.needs.energy = clamp(this.needs.energy + 18, 0, 100);
        this.remember("food", { x: food.x, y: food.y, z: food.z }, 1);
        this.thought = "Encontrei comida.";
        this.target = vec(food.x, food.y, food.z);
        this.targetLabel = "comida";
        return this.state;
      }
      this.state = "PROCURANDO_COMIDA";
      this.target = vec(food.x, food.y + 0.15, food.z);
      this.targetLabel = "comida à vista";
      this.thought = `Comida a ${food.distance.toFixed(1)} m.`;
      return this.state;
    }

    if (hunger > 55 && feed > 0.1) {
      const memFood = this.bestMemory("food");
      this.state = "PROCURANDO_COMIDA";
      if (memFood && nav > 0.2) {
        this.target = vec(memFood.x, memFood.y, memFood.z);
        this.targetLabel = "comida lembrada";
        this.thought = "Eu já comi por ali.";
      } else {
        this.wanderAround(self, dt);
        this.thought = "O cheiro vem de algum lugar.";
      }
      return this.state;
    }

    if (energy < 22 || (energy < 40 && this.state === "DESCANSANDO")) {
      this.state = energy < 12 ? "POUSADA" : "DESCANSANDO";
      const safe = this.bestMemory("safe");
      this.target = safe ? vec(safe.x, safe.y, safe.z) : vec(self.pos.x, 1.72, self.pos.z);
      this.targetLabel = "pousar";
      this.thought = "As asas pesam. Pousar.";
      return this.state;
    }

    if (this.needs.curiosity > 55 && this.personality.curious > 0.45 && !threat) {
      const interesting = this.perceptions.find(
        (p) => p.kind === "human" || p.kind === "fly" || p.kind === "fan",
      );
      if (interesting && this.personality.bold > 0.4) {
        this.state = "PERSEGUINDO";
        this.target = vec(interesting.x, interesting.y + 0.4, interesting.z);
        this.targetLabel = interesting.label;
        this.thought = `O que é isso? ${interesting.label}.`;
        return this.state;
      }
    }

    this.wanderAround(self, dt);
    this.state = this.target && dist(self.pos, this.target) > 0.4 ? "VOANDO" : "EXPLORANDO";
    if (c < 0.45) this.thought = "Luz, sombra, ar. Continuar.";
    else this.thought = "O território é enorme. Explorar.";
    this.targetLabel = "explorar";
    return this.state;
  }

  finishEatLanding(pos: Vec3): void {
    this.remember("safe", pos, 0.7);
  }

  pipeline(flying: boolean) {
    const seeing = this.perceptions.length > 0 && this.m("vision") > 0.05;
    return {
      vision: seeing,
      perception: seeing && this.m("perception") > 0.05,
      memory: this.memories.length > 0 && this.m("memory") > 0.05,
      consciousness: this.m("consciousness") > 0.08,
      decision: this.m("consciousness") > 0.08,
      motor: flying || this.state !== "POUSADA",
    };
  }

  private bestMemory(kind: MemoryKind): MemoryTrace | null {
    let best: MemoryTrace | null = null;
    for (const mem of this.memories) {
      if (mem.kind !== kind) continue;
      if (!best || mem.strength > best.strength) best = mem;
    }
    return best;
  }

  private wanderAround(self: { pos: Vec3 }, dt: number): void {
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0 || !this.target) {
      this.wanderTimer = 2.2 + rand(0, 3);
      const nav = this.m("navigation");
      const spread = 2 + 6 * nav;
      const dangerMemories = this.memories.filter((memory) => memory.kind === "danger" && memory.strength > .18);
      let best = vec(self.pos.x, self.pos.y, self.pos.z);
      let bestScore = -Infinity;
      for (let i = 0; i < 6; i++) {
        const candidate = vec(
          clamp(self.pos.x + rand(-spread, spread), -9, 9),
          clamp(self.pos.y + rand(-0.6, 1.2), 1.3, 5.5),
          clamp(self.pos.z + rand(-spread, spread), -6.5, 6.5),
        );
        let dangerPenalty = 0;
        for (const memory of dangerMemories) {
          const d = Math.max(.25, dist(candidate, memory));
          dangerPenalty += memory.strength / d;
        }
        const travel = Math.min(1.8, dist(candidate, self.pos) * .12);
        const score = travel - dangerPenalty * (0.55 + nav * .65);
        if (score > bestScore) { bestScore = score; best = candidate; }
      }
      this.target = best;
      this.targetLabel = dangerMemories.length ? "rota longe do perigo lembrado" : "explorar";
    }
  }
}

export function yawForTarget(from: Vec3, to: Vec3): number {
  return yawTo(from, to);
}
