import { railings, rooms } from "./plan.ts";
import type { Point } from "./plan.ts";

export const livingLayouts = [
  {
    id: "tv-guest",
    name: "方案一",
    description: "电视 / 电视柜靠客房，沙发靠次卧 A",
    tvSide: "guest",
    sofaSide: "parents",
  },
  {
    id: "tv-bedroom-a",
    name: "方案二",
    description: "电视 / 电视柜靠次卧 A，沙发靠客房",
    tvSide: "parents",
    sofaSide: "guest",
  },
] as const;
export type LivingLayout = (typeof livingLayouts)[number]["id"];
export type LayoutPreview = LivingLayout | "empty";

// Shared by the UI swatches and both layouts. These are color previews, not
// product swatches or material/wood species specifications.
export const sofaColors = [
  { id: "sage", label: "灰绿色", color: "#879b91", cushion: "#a5b4aa" },
  { id: "brown", label: "棕色", color: "#985e3d", cushion: "#ac7653" },
  { id: "walnut", label: "胡桃色", color: "#523a2c", cushion: "#72513b" },
  { id: "black", label: "黑色", color: "#242528", cushion: "#35363a" },
] as const;
export type SofaColor = (typeof sofaColors)[number]["id"];
export const cabinetColors = [
  { id: "light-wood", label: "浅木色", color: "#c3ae91" },
  { id: "walnut", label: "胡桃色", color: "#674631" },
] as const;
export type CabinetColor = (typeof cabinetColors)[number]["id"];

export const balconyChoices = [
  { id: "balcony", name: "主阳台" },
  { id: "utility", name: "生活阳台" },
] as const;
export type BalconyId = (typeof balconyChoices)[number]["id"];
export type BalconyMode = "original" | "enclosed";
export type BalconyModes = Record<BalconyId, BalconyMode>;
export const balconyModeLabels: Record<BalconyMode, string> = {
  original: "保持原样",
  enclosed: "落地玻璃",
};

// Floor-to-ceiling glazing follows only the exterior edges, never the doors or
// shared kitchen wall. The original rails are hidden in this design preview.
export const balconyWindowRuns = railings.map(({ roomId, from, to }) => ({
  roomId,
  from,
  to,
  length: Math.hypot(to[0] - from[0], to[1] - from[1]),
  rotation: -Math.atan2(to[1] - from[1], to[0] - from[0]),
}));

// These are illustrative envelopes, not chosen products or surveyed dimensions.
export const furnitureSize = {
  tvCabinet: { width: 1.8, depth: 0.4, height: 0.42 },
  sofa: { width: 2.2, depth: 0.9, height: 0.8 },
};

export function livingPlacement(layout: LivingLayout) {
  const tvWest = layout === "tv-guest";
  return {
    tv: {
      center: [tvWest ? 2.95 : 6.45, 6.85] as Point,
      rotation: tvWest ? Math.PI / 2 : -Math.PI / 2,
    },
    sofa: {
      center: [tvWest ? 6.2 : 3.2, 6.85] as Point,
      rotation: tvWest ? -Math.PI / 2 : Math.PI / 2,
    },
  };
}

export const balconyRoofs = rooms
  .filter((room) => room.kind === "balcony")
  .map((room) => {
    const xs = room.polygon.map(([x]) => x);
    const zs = room.polygon.map(([, z]) => z);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minZ = Math.min(...zs), maxZ = Math.max(...zs);
    return {
      roomId: room.id,
      center: [(minX + maxX) / 2, (minZ + maxZ) / 2] as Point,
      width: maxX - minX,
      depth: maxZ - minZ,
      // Roof presence is confirmed; thickness and elevation remain schematic.
      thickness: 0.18,
    };
  });

export const utilityEquipment = {
  roomId: "utility",
  washer: { center: [3.05, 0.6] as Point, rotation: Math.PI / 2 },
  heater: { center: [2.89, 0.6] as Point, rotation: Math.PI / 2 },
};
