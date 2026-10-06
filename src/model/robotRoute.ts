import type { Point } from "./plan.ts";

// A preview route through utility/dining/living only; bedroom doors stay untouched.
export const robotCleaningRoute: readonly Point[] = [
  [4.02, 0.4], [4.02, 1.55], [5.30, 1.55], [5.30, 4.60],
  [4.75, 4.60], [4.75, 5.40], [5.55, 5.40], [5.55, 7.80],
  [3.85, 7.80], [3.85, 5.40], [4.75, 5.40], [4.75, 4.60],
  [5.30, 4.60], [5.30, 1.55], [4.02, 1.55], [4.02, 0.4],
];

export class RobotRoute {
  status: "idle" | "running" | "paused" = "idle";
  position: Point;
  heading = 0;
  private points: readonly Point[];
  private speed: number;
  private segment = 0;
  private progress = 0;
  private previousTime = 0;
  constructor(points: readonly Point[] = robotCleaningRoute, speed = 0.9) {
    this.points = points; this.speed = speed; this.position = points[0];
  }
  toggle(now: number) {
    if (this.status === "running") {
      if (this.advance(now)) this.status = "paused";
      return;
    }
    if (this.status === "idle") { this.segment = 0; this.progress = 0; this.position = this.points[0]; }
    this.status = "running"; this.previousTime = now;
  }
  pause(now: number) { if (this.status === "running") this.toggle(now); }
  advance(now: number) {
    if (this.status !== "running") return false;
    let travel = Math.max(0, Math.min(0.1, (now - this.previousTime) / 1000)) * this.speed;
    this.previousTime = now;
    while (this.segment < this.points.length - 1) {
      const [x, z] = this.points[this.segment], [endX, endZ] = this.points[this.segment + 1];
      const length = Math.hypot(endX - x, endZ - z);
      if (travel >= length - this.progress) {
        travel -= length - this.progress; this.segment++; this.progress = 0;
        this.position = this.points[this.segment];
      } else {
        this.progress += travel;
        const fraction = this.progress / length;
        this.position = [x + (endX - x) * fraction, z + (endZ - z) * fraction];
        this.heading = Math.atan2(endX - x, endZ - z);
        return true;
      }
    }
    this.status = "idle"; this.heading = 0;
    return false;
  }
}
