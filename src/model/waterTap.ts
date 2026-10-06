import * as THREE from "three";
import { OpenCloseMotion } from "./OpenCloseMotion.ts";

export class WaterTap {
  private motion = new OpenCloseMotion(false);
  private outletY: number;
  private length: number;
  private stream: THREE.Mesh;
  private splash: THREE.Mesh;
  private handle: THREE.Group;
  constructor(stream: THREE.Mesh, splash: THREE.Mesh, handle: THREE.Group, outletY: number, bottomY: number) {
    this.stream = stream; this.splash = splash; this.handle = handle;
    this.outletY = outletY; this.length = outletY - bottomY;
    this.apply();
  }
  get on() { return this.motion.open; }
  toggle(now: number, reducedMotion = false) { this.motion.toggle(now, reducedMotion); this.apply(); }
  advance(now: number) { const moving = this.motion.advance(now); this.apply(); return moving; }
  private apply() {
    const value = this.motion.value;
    this.stream.visible = value > 0;
    this.stream.scale.y = Math.max(0.001, this.length * value);
    this.stream.position.y = this.outletY - this.length * value / 2;
    this.splash.visible = value > 0.99;
    this.handle.rotation.x = -0.3 * value;
  }
}
