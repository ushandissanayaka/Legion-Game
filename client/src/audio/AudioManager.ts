// ============================================================
// AudioManager — Web Audio API synthesized sounds
// No external audio files required
// ============================================================

export class AudioManager {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    // Resume on user gesture
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private noise(duration: number, freq: number, type: OscillatorType, gain: number, decay: number): void {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.3, ctx.currentTime + duration);

      gainNode.gain.setValueAtTime(gain, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + decay);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  private noiseBuffer(duration: number, gain: number): void {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(gain, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 0.5;

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start();
      source.stop(ctx.currentTime + duration);
    } catch {}
  }

  playShoot(): void {
    if (!this.enabled) return;
    // Short noise burst + low thump
    this.noiseBuffer(0.08, 0.4);
    this.noise(0.1, 120, 'sine', 0.5, 0.08);
  }

  playHit(): void {
    if (!this.enabled) return;
    // Sharp high tick
    this.noise(0.05, 1200, 'square', 0.3, 0.05);
  }

  playDeath(): void {
    if (!this.enabled) return;
    // Deep thud + reverb feel
    this.noise(0.4, 60, 'sine', 0.6, 0.4);
    this.noiseBuffer(0.3, 0.2);
  }

  playRespawn(): void {
    if (!this.enabled) return;
    // Ascending arpeggio
    const notes = [220, 330, 440, 660];
    notes.forEach((freq, i) => {
      setTimeout(() => this.noise(0.15, freq, 'sine', 0.3, 0.15), i * 80);
    });
  }

  playMatchStart(): void {
    if (!this.enabled) return;
    // Rising power chord
    const sequence = [220, 330, 440, 660, 880];
    sequence.forEach((freq, i) => {
      setTimeout(() => this.noise(0.2, freq, 'triangle', 0.25, 0.2), i * 100);
    });
  }

  playClick(): void {
    if (!this.enabled) return;
    this.noise(0.04, 800, 'square', 0.2, 0.04);
  }

  playReload(): void {
    if (!this.enabled) return;
    this.noise(0.12, 260, 'triangle', 0.25, 0.12);
  }

  playReloadComplete(): void {
    if (!this.enabled) return;
    this.noise(0.08, 520, 'square', 0.2, 0.08);
    this.noise(0.14, 780, 'triangle', 0.18, 0.14);
  }

  playCountdown(): void {
    if (!this.enabled) return;
    this.noise(0.2, 440, 'sine', 0.35, 0.2);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  dispose(): void {
    this.ctx?.close();
    this.ctx = null;
  }
}
