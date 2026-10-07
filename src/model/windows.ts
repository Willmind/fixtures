import * as THREE from "three";
import type { Opening } from "./plan.ts";

/** Sliding preview: the last pane stacks beside its neighbour. */
export function createSlidingWindow(opening: Opening, materials: {
  frame: THREE.Material; glass: THREE.Material; handle: THREE.Material;
}, paneCount: 2 | 3 = 2) {
  const group = new THREE.Group();
  group.name = "operable-room-window";
  group.position.set(opening.start, opening.sill, 0);
  const width = opening.end - opening.start, height = opening.top - opening.sill;
  const frame = 0.025, clearWidth = width - frame * 2;
  const panelWidth = (clearWidth + frame * (paneCount - 1)) / paneCount;
  const travel = panelWidth - frame;
  const topBars: THREE.Mesh[] = [], bottomBars: { mesh: THREE.Mesh; y: number }[] = [];
  const box = (parent: THREE.Group, size: [number, number, number], position: [number, number, number], material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  for (const x of [frame / 2, width - frame / 2]) {
    box(group, [frame, height, 0.07], [x, height / 2, 0], materials.frame);
  }
  const bottom = box(group, [width, frame, 0.07], [width / 2, frame / 2, 0], materials.frame);
  bottomBars.push({ mesh: bottom, y: frame / 2 });
  topBars.push(box(group, [width, frame, 0.07], [width / 2, height - frame / 2, 0], materials.frame));

  let moving!: THREE.Group, handle!: THREE.Mesh;
  const closedX = frame + (paneCount - 1) * travel;
  for (let index = 0; index < paneCount; index++) {
    const sliding = index === paneCount - 1;
    const panel = new THREE.Group();
    panel.name = sliding ? "sliding-window-panel" : "fixed-window-panel";
    panel.position.set(frame + index * travel, 0, sliding ? 0.022 : -0.022);
    group.add(panel);
    box(panel, [panelWidth - frame * 2, height - frame * 4, 0.006],
      [panelWidth / 2, height / 2, 0], materials.glass);
    for (const x of [frame / 2, panelWidth - frame / 2]) {
      box(panel, [frame, height - frame * 2, 0.025], [x, height / 2, 0], materials.frame);
    }
    bottomBars.push({ mesh: box(panel, [panelWidth, frame, 0.025],
      [panelWidth / 2, frame * 1.5, 0], materials.frame), y: frame * 1.5 });
    topBars.push(box(panel, [panelWidth, frame, 0.025],
      [panelWidth / 2, height - frame * 1.5, 0], materials.frame));
    if (sliding) {
      moving = panel;
      handle = box(panel, [0.017, 0.14, 0.065], [panelWidth - frame - 0.017, height / 2, 0], materials.handle);
    }
  }
  return {
    group,
    apply(value: number) { moving.position.x = closedX - travel * value; },
    setVisibleHeight(wallHeight: number) {
      const reveal = Math.max(0, Math.min(opening.top, wallHeight) - opening.sill);
      group.visible = reveal > 0;
      if (!group.visible) return;
      const scale = reveal / height;
      group.scale.y = scale;
      for (const top of topBars) top.visible = reveal >= height;
      for (const { mesh, y } of bottomBars) {
        mesh.scale.y = 1 / scale;
        mesh.position.y = y / scale;
      }
      handle.position.y = reveal / 2 / scale;
      handle.scale.y = Math.min(0.14, Math.max(0.015, reveal - frame * 4)) / 0.14 / scale;
    },
  };
}
