/** Sun shadows depend on geometry, not the viewing camera or room labels. */
export class ShadowUpdates {
  private dirty = true;
  private wasMoving = false;

  invalidate() { this.dirty = true; }

  consume(moving: boolean) {
    // Include the last frame: an animation may finish between two frames.
    const refresh = this.dirty || moving || this.wasMoving;
    this.dirty = false;
    this.wasMoving = moving;
    return refresh;
  }
}
