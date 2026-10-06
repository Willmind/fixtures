/** Reversible, on-demand motion shared by doors and storage drawers. */
export class OpenCloseMotion {
  value: number;
  open: boolean;
  private from: number;
  private startedAt = 0;
  private duration = 0;

  constructor(initialOpen = true) {
    this.open = initialOpen;
    this.value = this.from = Number(initialOpen);
  }

  toggle(now: number, reducedMotion = false) {
    this.setOpen(!this.open, now, reducedMotion);
  }

  setOpen(open: boolean, now: number, reducedMotion = false) {
    this.advance(now);
    this.open = open;
    this.from = this.value;
    this.startedAt = now;
    this.duration = reducedMotion ? 0 : 420 * Math.abs(Number(this.open) - this.from);
    this.advance(now);
  }

  advance(now: number) {
    const fraction = this.duration ? Math.min(1, Math.max(0, (now - this.startedAt) / this.duration)) : 1;
    const eased = fraction * fraction * (3 - 2 * fraction);
    this.value = this.from + (Number(this.open) - this.from) * eased;
    return fraction < 1;
  }
}
