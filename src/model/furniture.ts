import { furnitureSize } from "./arrangements.ts";
import { defaults } from "./plan.ts";

export type BoxPart = {
  size: [number, number, number];
  position: [number, number, number];
  radius?: number;
};

export const televisionMounts = [
  { id: "cabinet", label: "放电视柜上" },
  { id: "wall", label: "挂墙" },
] as const;
export type TelevisionMount = (typeof televisionMounts)[number]["id"];

// A recessed plinth supports the sofa while keeping its existing seat height.
export const sofaSupport: BoxPart = {
  size: [furnitureSize.sofa.width - 0.18, 0.14, furnitureSize.sofa.depth - 0.18],
  position: [0, 0.07, 0],
};
export const sofaBody: BoxPart = {
  size: [furnitureSize.sofa.width, 0.25, furnitureSize.sofa.depth],
  position: [0, 0.23, 0],
  radius: 0.07,
};

const screenSize: BoxPart["size"] = [1.45, 0.84, 0.06];
const baseHeight = 0.025;
const stemHeight = 0.2;
const joinOverlap = 0.01;
const cabinetTop = furnitureSize.tvCabinet.height;
const stemBottom = cabinetTop + baseHeight - joinOverlap;
const screenBottom = stemBottom + stemHeight - joinOverlap;
// Local +Z faces the room in both layouts. The wall face is 0.25 m behind
// the cabinet center (0.20 m half-depth + 0.05 m gap).
export const televisionWallZ = -0.25;
const wallScreenY = 1.2; // Illustrative mounting height, not a final installation.
const wallScreenZ = televisionWallZ + 0.08 + screenSize[2] / 2;

export const televisionParts: Record<TelevisionMount, { screen: BoxPart; supports: BoxPart[] }> = {
  cabinet: {
    screen: {
      size: screenSize,
      position: [0, screenBottom + screenSize[1] / 2, -0.04],
      radius: 0.02,
    },
    supports: [
      { size: [0.5, baseHeight, 0.18], position: [0, cabinetTop + baseHeight / 2, -0.02] },
      { size: [0.06, stemHeight, 0.06], position: [0, stemBottom + stemHeight / 2, -0.04] },
    ],
  },
  wall: {
    screen: { size: screenSize, position: [0, wallScreenY, wallScreenZ], radius: 0.02 },
    supports: [
      { size: [0.34, 0.22, 0.02], position: [0, wallScreenY, televisionWallZ + 0.01] },
      { size: [0.12, 0.1, 0.08], position: [0, wallScreenY, televisionWallZ + 0.05] },
    ],
  },
};

// Retain a small portion of the existing wall in cutaway mode so the wall
// mount remains visibly attached. It does not change the floor plan.
const backdropTop = wallScreenY + screenSize[1] / 2 + 0.12;
export const televisionWallBackdrop: BoxPart = {
  size: [screenSize[0] + 0.2, backdropTop - defaults.cutHeight, defaults.wallThickness],
  position: [0, (backdropTop + defaults.cutHeight) / 2, televisionWallZ - defaults.wallThickness / 2],
};
