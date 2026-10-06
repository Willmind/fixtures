import { railings, rooms } from "./plan.ts";
import type { Point } from "./plan.ts";

export const previewPalette = {
  wall: "#f3eddf",
  lightWalnut: "#b18f73",
};

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

// Temporary furniture footprints, measured in metres. Positions follow the
// simplified room polygons; products, service points and clearances are not final.
export const bedroomBeds = [
  { roomId: "master", center: [11.45, 6.85] as Point, rotation: Math.PI / 2, width: 1.8 },
  { roomId: "parents", center: [8.94, 6.82] as Point, rotation: -Math.PI / 2, width: 1.5 },
  { roomId: "study", center: [8.42, 2.63] as Point, rotation: 0, width: 1.2 },
] as const;

// Both bathrooms enter from the south. Keep the existing door openings clear:
// basin and toilet along the west wall, then a glazed shower at the far end.
export const bathroomFittings = rooms.filter((room) => room.kind === "bathroom").map((room) => {
  const xs = room.polygon.map(([x]) => x), zs = room.polygon.map(([, z]) => z);
  const west = Math.min(...xs) + 0.1, east = Math.max(...xs) - 0.1;
  const north = Math.min(...zs) + 0.1, south = Math.max(...zs) - 0.1;
  const showerDepth = 0.9, partitionZ = north + showerDepth;
  return {
    roomId: room.id,
    vanity: { center: [west + 0.26, south - 0.47] as Point, rotation: Math.PI / 2 },
    toilet: { center: [west + 0.34, partitionZ + 0.55] as Point, rotation: Math.PI / 2 },
    shower: { center: [west + 0.015, north + 0.42] as Point, rotation: Math.PI / 2 },
    enclosure: {
      center: [(west + east) / 2, partitionZ] as Point,
      width: east - west, depth: showerDepth, height: 2.1, doorWidth: 0.76,
    },
  };
});

export const kitchenFurniture = {
  hood: { center: [0.97, 0.95] as Point, rotation: Math.PI / 2 },
  counter: { center: [1.0, 1.9] as Point, rotation: Math.PI / 2, width: 3.2, depth: 0.6 },
  cooktopOffset: 0.95,
  sinkOffset: -0.75,
};

export const diningFurniture = {
  center: [4.25, 2.65] as Point,
  width: 1.35,
  depth: 0.8,
  chairs: [
    { x: -0.37, z: -0.74, rotation: 0 },
    { x: 0.37, z: -0.74, rotation: 0 },
    { x: -0.37, z: 0.74, rotation: Math.PI },
    { x: 0.37, z: 0.74, rotation: Math.PI },
  ],
};

export const roomCurtains = [
  { roomId: "master", center: [11.9, 8.46] as Point, width: 2.15 },
  { roomId: "master", center: [12.8, 1.39] as Point, width: 1.3 },
  { roomId: "parents", center: [8.5, 8.46] as Point, width: 2.15 },
  { roomId: "study", center: [8.9, 1.39] as Point, width: 2.15 },
  { roomId: "living", center: [4.6, 8.44] as Point, width: 3.15 },
] as const;

export const bedroomAirConditioners = [
  { roomId: "guest", center: [0.205, 5.8] as Point, rotation: Math.PI / 2 },
  { roomId: "parents", center: [9.4, 5.355] as Point, rotation: 0 },
  { roomId: "study", center: [9.995, 2.5] as Point, rotation: -Math.PI / 2 },
  { roomId: "master", center: [13.375, 6.9] as Point, rotation: -Math.PI / 2 },
] as const;

export const livingAirConditioner = { center: [6.4, 8.23] as Point, rotation: -Math.PI / 2 };
