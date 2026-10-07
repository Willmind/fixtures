/** Freeze reflections while navigating. Spread refreshes over separate frames
 * and throttle ambient animation, without running an idle render loop. */
export class ReflectionBudget {
  private refreshed = new Map<number, { time: number; revision: number }>();
  private lastFrame = -Infinity;
  private revision = 0;
  private deferred = false;

  beginFrame(moving: boolean) {
    this.deferred = false;
    // When navigation finishes, even a recently cached view must be replaced.
    if (moving) this.invalidate();
  }

  invalidate() { this.revision++; }

  get needsAnotherFrame() { return this.deferred; }

  allow(index: number, now: number, moving: boolean) {
    if (moving) return false;
    const last = this.refreshed.get(index);
    if (last && last.revision === this.revision && now - last.time < 250) return false;
    if (this.lastFrame === now) {
      this.deferred = true;
      return false;
    }
    this.refreshed.set(index, { time: now, revision: this.revision });
    this.lastFrame = now;
    return true;
  }
}
