import type { ControlBindings } from "./types";

const GAME_CODES = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD",
  "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight",
  "Space", "ControlLeft", "ControlRight", "ShiftLeft", "ShiftRight",
  "KeyC", "KeyQ", "KeyE", "KeyR", "KeyF", "Tab",
]);

export interface Actions {
  moveX: number;
  moveZ: number;
  moveY: number;
  boost: boolean;
  lookX: number;
  lookY: number;
  steer: number;
  bank: number;
  land: boolean;
  interact: boolean;
  cameraOrbit: boolean;
  zoom: number;
}

function damp(current: number, target: number, rate: number, dt: number): number {
  return target + (current - target) * Math.exp(-rate * dt);
}

function deadzone(value: number, zone = 0.16): number {
  const magnitude = Math.abs(value);
  if (magnitude <= zone) return 0;
  return Math.sign(value) * Math.min(1, (magnitude - zone) / (1 - zone));
}

export class Input {
  keys = new Set<string>();
  injected = new Set<string>();
  private mouseDX = 0;
  private mouseDY = 0;
  private locked = false;
  private orbitHeld = false;
  private wheelDelta = 0;
  private steerOverride: number | null = null;

  private moveX = 0;
  private moveZ = 0;
  private moveY = 0;
  private steer = 0;
  private bank = 0;
  private lookX = 0;
  private lookY = 0;

  touchMoveX = 0;
  touchMoveZ = 0;
  touchLookX = 0;
  touchLookY = 0;
  touchUp = false;
  touchDown = false;
  touchBoost = false;
  touchLand = false;
  touchInteract = false;
  lookSensitivity = 0.0022;
  invertY = false;
  bindings: ControlBindings = {
    forward: "KeyW",
    back: "KeyS",
    left: "KeyA",
    right: "KeyD",
    ascend: "Space",
    descend: "ControlLeft",
    boost: "ShiftLeft",
    bankLeft: "KeyQ",
    bankRight: "KeyE",
    land: "KeyR",
    interact: "KeyF",
    laboratory: "Tab",
  };
  enabled = true;

  attach(target: HTMLElement): () => void {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!this.enabled) return;
      this.keys.add(e.code);
      if (GAME_CODES.has(e.code)) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
    };
    const clear = () => {
      this.keys.clear();
      this.moveX = 0;
      this.moveZ = 0;
      this.moveY = 0;
      this.steer = 0;
      this.bank = 0;
      this.mouseDX = 0;
      this.mouseDY = 0;
      this.touchMoveX = 0;
      this.touchMoveZ = 0;
      this.touchLookX = 0;
      this.touchLookY = 0;
      this.touchUp = false;
      this.touchDown = false;
      this.touchBoost = false;
      this.touchLand = false;
      this.touchInteract = false;
      this.orbitHeld = false;
      this.wheelDelta = 0;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!this.enabled || !this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    };
    const onLockChange = () => {
      this.locked = document.pointerLockElement === target;
      this.mouseDX = 0;
      this.mouseDY = 0;
      this.lookX = 0;
      this.lookY = 0;
    };
    const onCanvasClick = () => {
      if (!this.enabled || this.locked || document.pointerLockElement) return;
      try { void target.requestPointerLock(); } catch { /* browser/iframe pode bloquear */ }
    };
    const onVisibility = () => { if (document.hidden) clear(); };

    const onMouseDown = (e: MouseEvent) => {
      if (!this.enabled) return;
      if (e.button === 2) { this.orbitHeld = true; e.preventDefault(); }
    };
    const onMouseUp = (e: MouseEvent) => { if (e.button === 2) this.orbitHeld = false; };
    const onWheel = (e: WheelEvent) => {
      if (!this.enabled) return;
      this.wheelDelta += Math.sign(e.deltaY);
      e.preventDefault();
    };
    const onContext = (e: MouseEvent) => e.preventDefault();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("mousemove", onMouseMove);
    target.addEventListener("click", onCanvasClick);
    target.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    target.addEventListener("wheel", onWheel, { passive: false });
    target.addEventListener("contextmenu", onContext);
    document.addEventListener("pointerlockchange", onLockChange);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("mousemove", onMouseMove);
      target.removeEventListener("click", onCanvasClick);
      target.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      target.removeEventListener("wheel", onWheel);
      target.removeEventListener("contextmenu", onContext);
      document.removeEventListener("pointerlockchange", onLockChange);
    };
  }

  isPointerLocked(): boolean {
    return this.locked;
  }

  isDown(code: string): boolean {
    if (code === this.bindings.land && this.touchLand) return true;
    if (code === this.bindings.interact && this.touchInteract) return true;
    return this.keys.has(code) || this.injected.has(code);
  }

  setInjected(codes: string[]): void {
    this.injected = new Set(codes);
  }

  setSteer(v: number): void {
    this.steerOverride = v;
  }

  addZoom(delta: number): void {
    this.wheelDelta += Math.sign(delta);
  }

  configure(bindings: ControlBindings, sensitivity: number, invertY: boolean): void {
    this.bindings = { ...bindings };
    this.lookSensitivity = sensitivity;
    this.invertY = invertY;
    for (const code of Object.values(bindings)) GAME_CODES.add(code);
  }

  sample(dt = 1 / 60): Actions {
    if (!this.enabled) {
      this.moveX = damp(this.moveX, 0, 20, dt);
      this.moveZ = damp(this.moveZ, 0, 20, dt);
      this.moveY = damp(this.moveY, 0, 20, dt);
      this.steer = damp(this.steer, 0, 20, dt);
      this.bank = damp(this.bank, 0, 20, dt);
      this.mouseDX = this.mouseDY = this.touchLookX = this.touchLookY = 0;
      const zoom = this.wheelDelta; this.wheelDelta = 0;
      return { moveX: this.moveX, moveZ: this.moveZ, moveY: this.moveY, boost: false, lookX: 0, lookY: 0, steer: this.steer, bank: this.bank, land: false, interact: false, cameraOrbit: false, zoom };
    }

    const left = this.isDown(this.bindings.left);
    const right = this.isDown(this.bindings.right);
    const forward = this.isDown(this.bindings.forward);
    const back = this.isDown(this.bindings.back);
    const gamepad = typeof navigator !== "undefined" && navigator.getGamepads ? Array.from(navigator.getGamepads()).find((pad): pad is Gamepad => !!pad && pad.connected) : undefined;
    const gpMoveX = gamepad ? deadzone(gamepad.axes[0] ?? 0) : 0;
    const gpMoveZ = gamepad ? -deadzone(gamepad.axes[1] ?? 0) : 0;
    const gpLookX = gamepad ? deadzone(gamepad.axes[2] ?? 0) * 11 : 0;
    const gpLookY = gamepad ? deadzone(gamepad.axes[3] ?? 0) * 9 : 0;
    const up = this.isDown(this.bindings.ascend) || this.touchUp || !!gamepad?.buttons[0]?.pressed;
    const down = this.isDown(this.bindings.descend) || this.touchDown || !!gamepad?.buttons[1]?.pressed;

    let targetX = (right ? 1 : 0) - (left ? 1 : 0) + this.touchMoveX + gpMoveX;
    let targetZ = (forward ? 1 : 0) - (back ? 1 : 0) + this.touchMoveZ + gpMoveZ;
    const targetMag = Math.hypot(targetX, targetZ);
    if (targetMag > 1) {
      targetX /= targetMag;
      targetZ /= targetMag;
    }
    const targetY = (up ? 1 : 0) - (down ? 1 : 0);

    const axisRate = targetMag > Math.hypot(this.moveX, this.moveZ) ? 16 : 11;
    this.moveX = damp(this.moveX, targetX, axisRate, dt);
    this.moveZ = damp(this.moveZ, targetZ, axisRate, dt);
    this.moveY = damp(this.moveY, targetY, Math.abs(targetY) > Math.abs(this.moveY) ? 16 : 10, dt);

    let targetSteer = 0;
    if (this.steerOverride !== null) targetSteer = this.steerOverride;
    this.steer = damp(this.steer, targetSteer, 14, dt);

    const targetBank = (this.isDown(this.bindings.bankRight) ? 1 : 0) - (this.isDown(this.bindings.bankLeft) ? 1 : 0) + (gamepad ? ((gamepad.buttons[7]?.value ?? 0) - (gamepad.buttons[6]?.value ?? 0)) : 0);
    this.bank = damp(this.bank, targetBank, 12, dt);

    const rawLookX = this.mouseDX + this.touchLookX + gpLookX;
    const rawLookY = (this.mouseDY + this.touchLookY + gpLookY) * (this.invertY ? -1 : 1);
    this.lookX = damp(this.lookX, rawLookX, 24, dt);
    this.lookY = damp(this.lookY, rawLookY, 24, dt);
    const lookX = rawLookX * 0.72 + this.lookX * 0.28;
    const lookY = rawLookY * 0.72 + this.lookY * 0.28;

    this.mouseDX = 0;
    this.mouseDY = 0;
    this.touchLookX = 0;
    this.touchLookY = 0;
    const zoom = this.wheelDelta;
    this.wheelDelta = 0;

    return {
      moveX: Math.abs(this.moveX) < 0.001 ? 0 : this.moveX,
      moveZ: Math.abs(this.moveZ) < 0.001 ? 0 : this.moveZ,
      moveY: Math.abs(this.moveY) < 0.001 ? 0 : this.moveY,
      boost: this.isDown(this.bindings.boost) || this.touchBoost || !!gamepad?.buttons[5]?.pressed,
      lookX,
      lookY,
      steer: this.steer,
      bank: this.bank,
      land: this.isDown(this.bindings.land) || this.touchLand || !!gamepad?.buttons[2]?.pressed,
      interact: this.isDown(this.bindings.interact) || this.touchInteract || !!gamepad?.buttons[3]?.pressed,
      cameraOrbit: this.orbitHeld,
      zoom,
    };
  }
}
