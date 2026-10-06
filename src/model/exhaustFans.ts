import * as THREE from "three";
import { OpenCloseMotion } from "./OpenCloseMotion.ts";

/** Independent fan motor, with a short spin-up and coast-down. */
export class ExhaustFan {
  private motion = new OpenCloseMotion(false);
  private previousTime = 0;
  private previousSpeed = 0;
  private reducedMotion = false;
  readonly rotor: THREE.Group;
  private indicator: THREE.MeshBasicMaterial;

  constructor(rotor: THREE.Group, indicator: THREE.MeshBasicMaterial) {
    this.rotor = rotor;
    this.indicator = indicator;
    this.updateIndicator();
  }
  get on() { return this.motion.open; }
  toggle(now: number, reducedMotion = false) {
    this.advance(now);
    this.reducedMotion = reducedMotion;
    this.motion.toggle(now, reducedMotion);
    this.previousTime = now;
    if (reducedMotion) this.previousSpeed = 0;
    this.updateIndicator();
  }
  advance(now: number) {
    const changing = this.motion.advance(now);
    const elapsed = Math.max(0, Math.min(0.08, (now - this.previousTime) / 1000));
    const speed = this.reducedMotion ? 0 : this.motion.value * Math.PI * 3;
    this.rotor.rotation.z = (this.rotor.rotation.z + (this.previousSpeed + speed) / 2 * elapsed) % (Math.PI * 2);
    this.previousTime = now;
    this.previousSpeed = speed;
    return changing || (this.on && !this.reducedMotion);
  }
  private updateIndicator() {
    this.indicator.color.set(this.on ? "#7ddda5" : "#819190");
  }
}
