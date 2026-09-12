import type { Vec3 } from "./types";

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function expDecay(current: number, target: number, rate: number, dt: number): number {
  return target + (current - target) * Math.exp(-rate * dt);
}


export function expDecayAngle(current: number, target: number, rate: number, dt: number): number {
  const delta = wrapAngle(target - current);
  return wrapAngle(current + delta * (1 - Math.exp(-rate * dt)));
}

export function rand(a = 0, b = 1): number {
  return a + Math.random() * (b - a);
}

export function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function vec(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

export function copy(out: Vec3, a: Vec3): Vec3 {
  out.x = a.x;
  out.y = a.y;
  out.z = a.z;
  return out;
}

export function setV(out: Vec3, x: number, y: number, z: number): Vec3 {
  out.x = x;
  out.y = y;
  out.z = z;
  return out;
}

export function addScaled(out: Vec3, a: Vec3, s: number): Vec3 {
  out.x += a.x * s;
  out.y += a.y * s;
  out.z += a.z * s;
  return out;
}

export function dist2(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

export function dist(a: Vec3, b: Vec3): number {
  return Math.sqrt(dist2(a, b));
}

export function lengthXZ(v: Vec3): number {
  return Math.hypot(v.x, v.z);
}

export function normalizeXZ(x: number, z: number): { x: number; z: number } {
  const l = Math.hypot(x, z) || 1;
  return { x: x / l, z: z / l };
}

/** yaw = 0 faces world −Z; +yaw is left (CCW about +Y). */
export function forwardFromYaw(yaw: number, pitch = 0): Vec3 {
  const cp = Math.cos(pitch);
  return {
    x: -Math.sin(yaw) * cp,
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * cp,
  };
}

export function rightFromYaw(yaw: number): Vec3 {
  return {
    x: Math.cos(yaw),
    y: 0,
    z: -Math.sin(yaw),
  };
}

export function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export function turnToward(current: number, target: number, maxDelta: number): number {
  const d = wrapAngle(target - current);
  if (d > maxDelta) return current + maxDelta;
  if (d < -maxDelta) return current - maxDelta;
  return current + d;
}

export function yawTo(from: Vec3, to: Vec3): number {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}
