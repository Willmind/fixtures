type Frames = {
  request: (callback: FrameRequestCallback) => number;
  cancel: (id: number) => void;
};

/** Coalesce invalidations; suspend all frame work while the page is hidden. */
export class OnDemandFrames {
  private pending?: number;
  private disposed = false;
  private visible: boolean;
  private readonly draw: FrameRequestCallback;
  private readonly frames: Frames;

  constructor(draw: FrameRequestCallback, frames: Frames, visible = true) {
    this.draw = draw;
    this.frames = frames;
    this.visible = visible;
  }

  request() {
    if (this.disposed || !this.visible || this.pending !== undefined) return;
    this.pending = this.frames.request((now) => {
      this.pending = undefined;
      if (!this.disposed && this.visible) this.draw(now);
    });
  }

  setVisible(visible: boolean) {
    if (this.disposed || this.visible === visible) return;
    this.visible = visible;
    if (visible) this.request();
    else this.cancel();
  }

  private cancel() {
    if (this.pending !== undefined) this.frames.cancel(this.pending);
    this.pending = undefined;
  }

  dispose() {
    this.disposed = true;
    this.cancel();
  }
}
