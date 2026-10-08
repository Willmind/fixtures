import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { HomeFixtures } from "./HomeFixtures.ts";

type Hint = { key: string; target: THREE.Mesh; label: CSS2DObject;
  button: HTMLButtonElement; text: HTMLElement; feedback: HTMLElement };

/** DOM hints share the original fixture targets; no extra meshes or animation loop. */
export class FixtureHints {
  private hints: Hint[] = [];
  private targets = new Map<string, THREE.Mesh>();
  private point = new THREE.Vector3();
  private screenPoint = new THREE.Vector3();
  private fixtures: HomeFixtures;
  private feedbackHint?: Hint;
  private feedbackTimeout?: ReturnType<typeof setTimeout>;
  private onFeedbackEnd: () => void;

  constructor(fixtures: HomeFixtures, onFeedbackEnd: () => void = () => {}) {
    this.fixtures = fixtures;
    this.onFeedbackEnd = onFeedbackEnd;
    const candidates = new Map<string, { target: THREE.Mesh; area: number; priority: number }>();
    fixtures.group.updateMatrixWorld(true);
    fixtures.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      // Flames and water streams are transient geometry, never the control anchor.
      for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) {
        if (!parent.visible) return;
      }
      const info = fixtures.interactionInfo(object);
      if (!info) return;
      object.geometry.computeBoundingBox();
      const size = object.geometry.boundingBox!.getSize(new THREE.Vector3()).multiply(object.scale);
      const area = Math.max(size.x * size.y, size.y * size.z, size.x * size.z);
      const priority = object.userData.fixtureHintPriority ?? 0;
      const previous = candidates.get(info.key);
      if (!previous || priority > previous.priority || (priority === previous.priority && area > previous.area)) {
        candidates.set(info.key, { target: object, area, priority });
      }
    });
    for (const [key, { target }] of candidates) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "fixture-hint";
      button.dataset.fixtureHint = key;
      const dot = document.createElement("span");
      dot.className = "fixture-hint-dot";
      dot.setAttribute("aria-hidden", "true");
      const text = document.createElement("span");
      text.className = "fixture-hint-tooltip";
      const feedback = document.createElement("span");
      feedback.className = "fixture-hint-feedback";
      feedback.setAttribute("aria-hidden", "true");
      button.append(dot, text, feedback);
      const label = new CSS2DObject(button);
      label.name = `fixture-hint-${key}`;
      target.geometry.boundingBox!.getCenter(label.position);
      label.visible = false;
      target.add(label);
      this.targets.set(key, target);
      this.hints.push({ key, target, label, button, text, feedback });
    }
    this.refresh();
  }

  targetFor(key: string) { return this.targets.get(key); }

  showFeedback(object: THREE.Object3D) {
    this.clearFeedback();
    const info = this.fixtures.interactionInfo(object);
    const hint = info && this.hints.find((item) => item.key === info.key);
    if (!hint?.label.visible || !info) return false;
    hint.feedback.textContent = info.feedback;
    hint.button.dataset.feedback = "true";
    this.feedbackHint = hint;
    // One expiry invalidation; a static result does not keep WebGL rendering.
    this.feedbackTimeout = setTimeout(() => {
      this.clearFeedback();
      this.onFeedbackEnd();
    }, 2200);
    return true;
  }

  clearFeedback() {
    if (this.feedbackTimeout !== undefined) clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = undefined;
    if (this.feedbackHint) delete this.feedbackHint.button.dataset.feedback;
    this.feedbackHint = undefined;
  }

  refresh() {
    for (const hint of this.hints) {
      const info = this.fixtures.interactionInfo(hint.target);
      if (!info) continue;
      const text = `${info.title} · ${info.action}`;
      if (hint.text.textContent !== text) {
        hint.text.textContent = text;
        hint.button.setAttribute("aria-label", text);
        hint.button.setAttribute("aria-pressed", String(info.active));
      }
    }
  }

  update(camera: THREE.Camera, clipping: readonly THREE.Plane[], width: number, height: number, enabled: boolean) {
    if (!enabled) this.clearFeedback();
    const occupied: { x: number; y: number }[] = [];
    // Prioritize the object just operated so another nearby dot cannot hide its result.
    const ordered = this.feedbackHint ? [this.feedbackHint, ...this.hints.filter((hint) => hint !== this.feedbackHint)] : this.hints;
    for (const hint of ordered) {
      let visible = enabled && hint.target.layers.test(camera.layers);
      for (let parent: THREE.Object3D | null = hint.target; visible && parent; parent = parent.parent) {
        if (!parent.visible) visible = false;
      }
      if (visible) {
        hint.label.getWorldPosition(this.point);
        this.screenPoint.copy(this.point).project(camera);
        const x = this.screenPoint.x * width / 2, y = this.screenPoint.y * height / 2;
        visible = Math.abs(this.screenPoint.x) <= 0.94 && Math.abs(this.screenPoint.y) <= 0.94
          && Math.abs(this.screenPoint.z) <= 1 && clipping.every((plane) => plane.distanceToPoint(this.point) >= 0)
          && !occupied.some((other) => Math.hypot(other.x - x, other.y - y) < 44);
        if (visible) occupied.push({ x, y });
        if (visible && hint === this.feedbackHint) {
          const bubbleWidth = Math.min(220, Math.max(0, width - 24));
          const offset = THREE.MathUtils.clamp(0, -width / 2 + bubbleWidth / 2 + 12 - x,
            width / 2 - bubbleWidth / 2 - 12 - x);
          hint.feedback.style.left = `calc(50% + ${offset}px)`;
          hint.button.dataset.feedbackPlacement = height / 2 - y < 70 ? "below" : "above";
        }
      }
      hint.label.visible = visible;
    }
    if (enabled) this.refresh();
  }

  dispose() {
    this.clearFeedback();
    for (const hint of this.hints) hint.label.removeFromParent();
    this.hints = [];
    this.targets.clear();
  }
}
