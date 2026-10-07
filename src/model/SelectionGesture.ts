type PointerSample = Pick<
  PointerEvent,
  "pointerId" | "clientX" | "clientY" | "button"
>;

/** Only a single stationary pointer is a room selection, never a drag or pinch. */
export class SelectionGesture {
  private pointers = new Set<number>();
  private candidate: PointerSample | null = null;
  private tolerance: number;

  constructor(tolerance = 5) {
    this.tolerance = tolerance;
  }

  start(event: PointerSample) {
    this.pointers.add(event.pointerId);
    this.candidate =
      this.pointers.size === 1 && event.button === 0
        ? {
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
            button: event.button,
          }
        : null;
  }

  move(event: PointerSample) {
    if (
      this.candidate?.pointerId === event.pointerId &&
      Math.hypot(
        event.clientX - this.candidate.clientX,
        event.clientY - this.candidate.clientY,
      ) > this.tolerance
    ) {
      this.candidate = null;
    }
  }

  end(event: PointerSample) {
    this.move(event);
    const selected =
      this.pointers.size === 1 &&
      this.candidate?.pointerId === event.pointerId &&
      event.button === 0;
    this.cancel(event.pointerId);
    return selected;
  }

  cancel(pointerId: number) {
    this.pointers.delete(pointerId);
    this.candidate = null;
  }
}
