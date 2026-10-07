type Timers = {
  schedule: (callback: () => void, delay: number) => number;
  cancel: (id: number) => void;
};

/** Persist the latest position periodically, rather than serializing history every frame. */
export class ScrollPositionWriter {
  private readonly write: (top: number) => void;
  private readonly timers: Timers;
  private timer?: number;
  private latest?: number;
  private written?: number;

  constructor(write: (top: number) => void, timers: Timers) {
    this.write = write;
    this.timers = timers;
  }
  record(top: number) {
    this.latest = top;
    if (this.timer !== undefined) return;
    this.timer = this.timers.schedule(() => {
      this.timer = undefined;
      this.flush();
    }, 200);
  }
  flush() {
    if (this.timer !== undefined) this.timers.cancel(this.timer);
    this.timer = undefined;
    const top = this.latest;
    this.latest = undefined;
    if (top === undefined || top === this.written) return;
    this.write(top);
    this.written = top;
  }
  // A delayed write from the previous page must never overwrite the next entry.
  cancel() {
    if (this.timer !== undefined) this.timers.cancel(this.timer);
    this.timer = undefined;
    this.latest = this.written = undefined;
  }
}
