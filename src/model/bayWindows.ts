import * as THREE from "three";
import { splitWall } from "./geometry.ts";
import type { Opening, Wall } from "./plan.ts";

// Three wide, low window niches are visible in the site photos. The original
// guest room (now the office) has a normal window and is deliberately excluded.
// Widths follow the simplified plan; projection and height need a site measurement.
export const bayWindows = [
  { roomId: "master", wallId: "master-south", start: 0.20, end: 3.20, outside: 1, panes: 3 },
  { roomId: "parents", wallId: "bedroom-a-south", start: 0.20, end: 3.20, outside: 1, panes: 3 },
  { roomId: "study", wallId: "study-north", start: 0.20, end: 2.40, outside: -1, panes: 2 },
].map((bay) => ({ ...bay, projection: 0.50, inward: 0.12, sill: 0.45 })) as BayWindow[];

export type BayWindow = {
  roomId: string; wallId: string; start: number; end: number;
  outside: number; panes: 2 | 3; projection: number; inward: number; sill: number;
};
export const bayWindowFor = (wallId: string) => bayWindows.find((bay) => bay.wallId === wallId);

/** Front portal is wider than the actual window at the back of the niche. */
export function bayPortal(bay: BayWindow, window: Opening): Opening {
  return { ...window, start: bay.start, end: bay.end, sill: 0 };
}

/** Local coordinates match the supporting wall: x along wall, z perpendicular. */
export function createBayWindow(wall: Wall, bay: BayWindow, height: number, materials: {
  wall: THREE.Material; sill: THREE.Material; railing: THREE.Material;
}) {
  const group = new THREE.Group();
  group.name = `${bay.roomId}-bay-window`;
  group.userData.roomId = bay.roomId;
  const opening = wall.openings!.find(({ kind }) => kind === "window")!;
  const width = bay.end - bay.start, center = (bay.start + bay.end) / 2;
  const depth = bay.projection + bay.inward;
  const z = bay.outside * (bay.projection - bay.inward) / 2;
  const box = (name: string, w: number, bottom: number, top: number, d: number,
    x: number, atZ: number, material: THREE.Material) => {
    top = Math.min(top, height);
    if (top <= bottom) return;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, top - bottom, d), material);
    mesh.name = name;
    mesh.position.set(x, (bottom + top) / 2, atZ);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  };

  // Slightly recessed pedestal and a distinct slab edge, as in the raw-room photos.
  box("bay-pedestal", width, 0, bay.sill - 0.035, depth - 0.06,
    center, z + bay.outside * 0.03, materials.wall);
  box("bay-sill", width, bay.sill - 0.035, bay.sill, depth,
    center, z, materials.sill);

  const revealThickness = 0.12;
  for (const x of [bay.start - revealThickness / 2, bay.end + revealThickness / 2]) {
    box("bay-side-return", revealThickness, bay.sill, opening.top,
      bay.projection, x, bay.outside * bay.projection / 2, materials.wall);
  }
  box("bay-lintel", width, opening.top, height, bay.projection,
    center, bay.outside * bay.projection / 2, materials.wall);
  const backOpening = { ...opening, start: opening.start - bay.start, end: opening.end - bay.start };
  for (const piece of splitWall(width, height, [backOpening])) {
    box("bay-back-wall", piece.end - piece.start, Math.max(bay.sill, piece.bottom), Math.min(opening.top, piece.top),
      revealThickness, bay.start + (piece.start + piece.end) / 2,
      bay.outside * bay.projection, materials.wall);
  }

  // The dark internal safety bars visible in all three bedrooms.
  const railZ = bay.outside * (bay.projection - 0.075);
  const railTop = bay.sill + 0.85, windowWidth = opening.end - opening.start;
  box("bay-guard-top", windowWidth, railTop - 0.022, railTop, 0.025,
    (opening.start + opening.end) / 2, railZ, materials.railing);
  const count = Math.ceil(windowWidth / 0.15);
  for (let i = 0; i <= count; i++) {
    box("bay-guard-bar", 0.014, bay.sill + 0.035, railTop - 0.022, 0.014,
      opening.start + windowWidth * i / count, railZ, materials.railing);
  }
  return group;
}
