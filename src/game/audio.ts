export type GameSfx = "notice" | "danger" | "hit" | "miss" | "eat" | "secret" | "rage" | "ui" | "death";

export interface AudioMix {
  master: number;
  effects: number;
  buzz: number;
}

export class Buzz {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private buzzGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private started = false;
  private mix: AudioMix = { master: 1, effects: 1, buzz: 0.9 };

  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.masterGain = this.ctx.createGain();
    this.effectsGain = this.ctx.createGain();
    this.buzzGain = this.ctx.createGain();
    this.compressor = this.ctx.createDynamicsCompressor();
    this.filter = this.ctx.createBiquadFilter();
    this.osc = this.ctx.createOscillator();

    this.compressor.threshold.value = -12;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 8;
    this.compressor.attack.value = 0.008;
    this.compressor.release.value = 0.18;
    this.masterGain.gain.value = this.mix.master;
    this.effectsGain.gain.value = this.mix.effects;
    this.buzzGain.gain.value = 0;

    this.osc.type = "sawtooth";
    this.osc.frequency.value = 145;
    this.filter.type = "bandpass";
    this.filter.frequency.value = 470;
    this.filter.Q.value = 0.9;

    this.osc.connect(this.filter);
    this.filter.connect(this.buzzGain);
    this.buzzGain.connect(this.masterGain);
    this.effectsGain.connect(this.masterGain);
    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);
    this.osc.start();
    this.started = true;
  }

  setMix(mix: Partial<AudioMix>): void {
    for (const key of ["master", "effects", "buzz"] as const) {
      const value = mix[key];
      if (typeof value === "number" && Number.isFinite(value)) this.mix[key] = Math.max(0, Math.min(1.5, value));
    }
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain?.gain.setTargetAtTime(Math.max(0, this.mix.master), now, 0.045);
    this.effectsGain?.gain.setTargetAtTime(Math.max(0, this.mix.effects), now, 0.045);
  }

  update(flying: boolean, speed: number, timeScale: number): void {
    if (!this.ctx || !this.osc || !this.buzzGain || !this.started) return;
    if (this.ctx.state === "suspended") return;
    const target = flying ? (0.14 + Math.min(0.18, speed * 0.024)) * this.mix.buzz : 0;
    const g = this.buzzGain.gain;
    g.setTargetAtTime(target * Math.min(1.2, Math.max(0, timeScale)), this.ctx.currentTime, 0.065);
    this.osc.frequency.setTargetAtTime(132 + speed * 21, this.ctx.currentTime, 0.08);
    this.filter?.frequency.setTargetAtTime(430 + speed * 26, this.ctx.currentTime, 0.1);
  }

  play(kind: GameSfx, intensity = 1): void {
    if (!this.ctx || !this.effectsGain || this.ctx.state === "suspended") return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const amount = Math.max(0.2, Math.min(1.6, intensity));
    const spec: Record<GameSfx, [OscillatorType, number, number, number, number]> = {
      notice: ["triangle", 520, 690, 0.075, 0.11],
      danger: ["sawtooth", 210, 125, 0.12, 0.16],
      hit: ["square", 115, 62, 0.16, 0.21],
      miss: ["triangle", 360, 220, 0.07, 0.12],
      eat: ["sine", 430, 620, 0.065, 0.12],
      secret: ["sine", 610, 980, 0.08, 0.22],
      rage: ["sawtooth", 145, 195, 0.11, 0.28],
      ui: ["sine", 690, 780, 0.045, 0.08],
      death: ["sawtooth", 155, 48, 0.18, 0.42],
    };
    const [wave, from, to, peak, duration] = spec[kind];
    osc.type = wave;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), now + duration);
    filter.type = "lowpass";
    filter.frequency.value = kind === "hit" || kind === "death" ? 1250 : 2800;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.002, peak * amount * 2.2), now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.effectsGain);
    osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  async preview(): Promise<void> {
    this.unlock();
    if (!this.ctx) return;
    await this.ctx.resume();
    this.play("notice");
  }

  dispose(): void {
    try {
      this.osc?.stop();
      void this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
  }
}
