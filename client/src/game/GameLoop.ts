// ============================================================
// GameLoop — requestAnimationFrame with delta time
// Separates render rate (60fps) from network rate (20fps)
// ============================================================

export class GameLoop {
  private rafId: number | null = null;
  private lastTime = 0;
  private networkAccum = 0;
  private readonly NETWORK_INTERVAL = 1000 / 20; // 20 fps

  private updateFn: (dt: number) => void;
  private networkFn: () => void;
  private renderFn: () => void;

  constructor(
    updateFn: (dt: number) => void,
    networkFn: () => void,
    renderFn: () => void
  ) {
    this.updateFn = updateFn;
    this.networkFn = networkFn;
    this.renderFn = renderFn;
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop = (now: number): void => {
    this.rafId = requestAnimationFrame(this.loop);

    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // cap at 100ms
    this.lastTime = now;

    this.updateFn(dt);

    this.networkAccum += dt * 1000;
    if (this.networkAccum >= this.NETWORK_INTERVAL) {
      this.networkFn();
      this.networkAccum -= this.NETWORK_INTERVAL;
    }

    this.renderFn();
  };

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
