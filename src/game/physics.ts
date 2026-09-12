import type { BoxCollider, Vec3 } from "./types";
import { clamp } from "./math";

export interface PhysBody {
  pos: Vec3;
  vel: Vec3;
  radius: number;
  landed: boolean;
  groundY: number;
}

export function integrateSphere(body: PhysBody, colliders: BoxCollider[], dt: number): void {
  body.landed = false;
  const r = body.radius;

  body.pos.x += body.vel.x * dt;
  resolveAxis(body, colliders, "x");
  body.pos.z += body.vel.z * dt;
  resolveAxis(body, colliders, "z");
  body.pos.y += body.vel.y * dt;
  resolveAxis(body, colliders, "y");

  body.pos.x = clamp(body.pos.x, -10.6 + r, 10.6 - r);
  body.pos.z = clamp(body.pos.z, -7.6 + r, 7.6 - r);
  body.pos.y = clamp(body.pos.y, r + 0.02, 8.2 - r);
}

const HARD_STOP_KINDS = new Set(["wall", "floor"]);

function resolveAxis(body: PhysBody, colliders: BoxCollider[], axis: "x" | "y" | "z"): void {
  const r = body.radius;
  for (const c of colliders) {
    const overlapX = body.pos.x + r > c.minx && body.pos.x - r < c.maxx;
    const overlapY = body.pos.y + r > c.miny && body.pos.y - r < c.maxy;
    const overlapZ = body.pos.z + r > c.minz && body.pos.z - r < c.maxz;
    if (!(overlapX && overlapY && overlapZ)) continue;

    const soft = !HARD_STOP_KINDS.has(c.kind);
    const keep = soft ? -0.18 : 0;

    if (axis === "x") {
      const left = body.pos.x + r - c.minx;
      const right = c.maxx - (body.pos.x - r);
      if (left < right) body.pos.x = c.minx - r;
      else body.pos.x = c.maxx + r;
      body.vel.x *= keep;
    } else if (axis === "z") {
      const near = body.pos.z + r - c.minz;
      const far = c.maxz - (body.pos.z - r);
      if (near < far) body.pos.z = c.minz - r;
      else body.pos.z = c.maxz + r;
      body.vel.z *= keep;
    } else {
      const down = body.pos.y + r - c.miny;
      const up = c.maxy - (body.pos.y - r);
      if (up <= down) {
        body.pos.y = c.maxy + r;
        if (body.vel.y <= 0.15 && c.landable) {
          body.landed = true;
          body.groundY = c.maxy;
          body.vel.y = Math.max(0, body.vel.y);
        } else if (body.vel.y < 0) {
          body.vel.y *= keep;
        }
      } else {
        body.pos.y = c.miny - r;
        if (body.vel.y > 0) body.vel.y *= keep;
      }
    }
  }
}

export function avoidBoxes(
  pos: Vec3,
  dirX: number,
  dirZ: number,
  colliders: BoxCollider[],
  look = 0.8,
): { x: number; z: number } {
  const nx = pos.x + dirX * look;
  const nz = pos.z + dirZ * look;
  for (const c of colliders) {
    if (c.kind === "floor" || c.kind === "wall") continue;
    if (
      nx > c.minx - 0.15 &&
      nx < c.maxx + 0.15 &&
      nz > c.minz - 0.15 &&
      nz < c.maxz + 0.15 &&
      pos.y < c.maxy + 0.4
    ) {
      const cx = (c.minx + c.maxx) / 2;
      const cz = (c.minz + c.maxz) / 2;
      let ox = pos.x - cx;
      let oz = pos.z - cz;
      const l = Math.hypot(ox, oz) || 1;
      ox /= l;
      oz /= l;
      return { x: dirX * 0.3 + ox * 0.7, z: dirZ * 0.3 + oz * 0.7 };
    }
  }
  return { x: dirX, z: dirZ };
}

export function moveGroundCircle(
  pos: Vec3,
  vel: Vec3,
  radius: number,
  dt: number,
  colliders: BoxCollider[],
  actorHeight = 3.25,
): boolean {
  let collided = false;
  const blocks = (x: number, z: number): boolean => {
    for (const c of colliders) {
      if (c.kind === "floor" || c.maxy < 0.34) continue;
      if (c.miny > actorHeight) continue;
      if (x + radius <= c.minx || x - radius >= c.maxx || z + radius <= c.minz || z - radius >= c.maxz) continue;
      return true;
    }
    return false;
  };

  const nextX = pos.x + vel.x * dt;
  if (!blocks(nextX, pos.z)) pos.x = nextX;
  else { vel.x = 0; collided = true; }

  const nextZ = pos.z + vel.z * dt;
  if (!blocks(pos.x, nextZ)) pos.z = nextZ;
  else { vel.z = 0; collided = true; }

  pos.x = clamp(pos.x, -10.25 + radius, 10.25 - radius);
  pos.z = clamp(pos.z, -7.25 + radius, 7.25 - radius);
  return collided;
}

export function steerGroundAgent(
  pos: Vec3,
  dirX: number,
  dirZ: number,
  colliders: BoxCollider[],
  radius: number,
  look = 0.9,
  preferredSide: 1 | -1 = 1,
  actorHeight = 3.25,
): { x: number; z: number; blocked: boolean } {
  const length = Math.hypot(dirX, dirZ);
  if (length < 1e-5) return { x: 0, z: 0, blocked: false };
  const baseX = dirX / length, baseZ = dirZ / length;
  const blockedAt = (x: number, z: number): boolean => {
    for (const c of colliders) {
      if (c.kind === "floor" || c.maxy < 0.34 || c.miny > actorHeight) continue;
      if (x + radius <= c.minx || x - radius >= c.maxx || z + radius <= c.minz || z - radius >= c.maxz) continue;
      return true;
    }
    return false;
  };

  const offsets = [0, .34 * preferredSide, -.34 * preferredSide, .68 * preferredSide, -.68 * preferredSide, 1.02 * preferredSide, -1.02 * preferredSide, 1.38 * preferredSide, -1.38 * preferredSide];
  let best: { x: number; z: number; score: number } | null = null;
  let directBlocked = false;
  for (const angle of offsets) {
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const x = baseX * ca - baseZ * sa;
    const z = baseX * sa + baseZ * ca;
    const farBlocked = blockedAt(pos.x + x * look, pos.z + z * look);
    const nearBlocked = blockedAt(pos.x + x * look * .48, pos.z + z * look * .48);
    if (angle === 0) directBlocked = farBlocked || nearBlocked;
    if (farBlocked || nearBlocked) continue;
    const alignment = x * baseX + z * baseZ;
    const sideBias = Math.sign(angle || preferredSide) === preferredSide ? .025 : 0;
    const score = alignment - Math.abs(angle) * .075 + sideBias;
    if (!best || score > best.score) best = { x, z, score };
  }
  if (best) return { x: best.x, z: best.z, blocked: directBlocked };
  return { x: -baseZ * preferredSide, z: baseX * preferredSide, blocked: true };
}
