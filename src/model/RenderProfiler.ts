export type RenderSample = {
  frameWorkMs: number;
  drawCalls: number;
  triangles: number;
  renderPasses: number;
  geometries: number;
  textures: number;
  programs: number;
  lighting: "day" | "night";
  moving: boolean;
};

/** Bounded CPU/render counters, sampled only on actual frames, without a timer. */
export class RenderProfiler {
  private readonly capacity: number;
  private samples: RenderSample[] = [];
  private frames = 0;
  private updates = 0;
  private wallRebuilds = 0;

  constructor(capacity = 300) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error("capacity must be a positive integer");
    this.capacity = capacity;
  }
  record(sample: RenderSample) {
    this.frames++;
    this.samples.push({ ...sample });
    if (this.samples.length > this.capacity) this.samples.shift();
  }
  noteUpdate(wallsChanged: boolean) {
    this.updates++;
    if (wallsChanged) this.wallRebuilds++;
  }
  reset() { this.samples = []; this.frames = this.updates = this.wallRebuilds = 0; }
  summary() {
    const durations = this.samples.map((sample) => sample.frameWorkMs).sort((a, b) => a - b);
    const percentile = (fraction: number) => durations.length ? durations[Math.ceil(durations.length * fraction) - 1] : 0;
    return {
      frames: this.frames, updates: this.updates, wallRebuilds: this.wallRebuilds,
      samples: this.samples.length, medianFrameWorkMs: percentile(0.5), p95FrameWorkMs: percentile(0.95),
      latest: this.samples.length ? { ...this.samples[this.samples.length - 1] } : null,
    };
  }
}

declare global {
  interface Window { __fixturesPerformance?: RenderProfiler; }
}
