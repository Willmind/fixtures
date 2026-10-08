import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { HomeFixtures } from "./HomeFixtures.ts";

/** DOM hints share the original fixture targets; no extra meshes or animation loop. */
export class FixtureHints {
  private hints: { target: THREE.Mesh; label: CSS2DObject; button: HTMLButtonElement; text: HTMLElement }[] = [];
  private targets = new Map<string, THREE.Mesh>();
  private point = new THREE.Vector3();
  private screenPoint = new THREE.Vector3();
  private fixtures: HomeFixtures;

  constructor(fixtures: HomeFixtures) {
    this.fixtures = fixtures;
    const candidates = new Map<string, { target: THREE.Mesh; area: number }>();
    fixtures.group.updateMatrixWorld(true);
    fixtures.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || Array.isArray(object.userData.bedDrawerIds)) return;
      // Flames and water streams are transient geometry, never the control anchor.
      for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) {
        if (!parent.visible) return;
      }
      const info = fixtures.interactionInfo(object);
      if (!info) return;
      object.geometry.computeBoundingBox();
      const size = object.geometry.boundingBox!.getSize(new THREE.Vector3()).multiply(object.scale);
      const area = Math.max(size.x * size.y, size.y * size.z, size.x * size.z);
      if (area > (candidates.get(info.key)?.area ?? -1)) candidates.set(info.key, { target: object, area });
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
      button.append(dot, text);
      const label = new CSS2DObject(button);
      label.name = `fixture-hint-${key}`;
      target.geometry.boundingBox!.getCenter(label.position);
      label.visible = false;
      target.add(label);
      this.targets.set(key, target);
      this.hints.push({ target, label, button, text });
    }
    this.refresh();
  }

  targetFor(key: string) { return this.targets.get(key); }

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
    const occupied: { x: number; y: number }[] = [];
    for (const hint of this.hints) {
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
      }
      hint.label.visible = visible;
    }
    if (enabled) this.refresh();
  }

  dispose() {
    for (const hint of this.hints) hint.label.removeFromParent();
    this.hints = [];
    this.targets.clear();
  }
}
