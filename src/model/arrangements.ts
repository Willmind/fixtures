import { railings, rooms } from "./plan.ts";
import type { Point } from "./plan.ts";

export const previewPalette = {
  wall: "#f3eddf",
  lightWalnut: "#b18f73",
  sofa: "#b18f73",
  sofaCushion: "#c2a58d",
  tvCabinet: "#b18f73",
};

export const curtainColors = [
  { id: "ivory", label: "暖米黄", color: "#ead8ad", sheen: "#fff1d3" },
  { id: "cream", label: "奶油黄", color: "#e4c675", sheen: "#f5e4b0" },
  { id: "apricot", label: "杏色", color: "#dcb18c", sheen: "#f3d7bb" },
  { id: "honey", label: "蜂蜜黄", color: "#c99b42", sheen: "#edce87" },
  { id: "orange", label: "暖橙色", color: "#d18b53", sheen: "#efbd91" },
  { id: "terracotta", label: "陶土橙", color: "#b86f4d", sheen: "#e3ad8b" },
] as const;
export type CurtainColor = (typeof curtainColors)[number]["id"];

export const livingLayouts = [
  {
    id: "tv-guest",
    name: "方案一",
    description: "电视 / 电视柜靠书房，沙发靠次卧 A",
    tvSide: "guest",
    sofaSide: "parents",
  },
  {
    id: "tv-bedroom-a",
    name: "方案二",
    description: "电视 / 电视柜靠次卧 A，沙发靠书房",
    tvSide: "parents",
    sofaSide: "guest",
  },
] as const;
export type LivingLayout = (typeof livingLayouts)[number]["id"];
export type LayoutPreview = LivingLayout | "empty";

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
  coffeeTable: { width: 1.0, depth: 0.50, height: 0.38 },
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
    coffeeTable: {
      center: [tvWest ? 5.10 : 4.30, 6.85] as Point,
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
  robot: { center: [4.02, 0.4] as Point, rotation: 0, radius: 0.18 },
};

export const utilityDryingRack = {
  center: [4.65, 0.60] as Point,
  width: 1.65, depth: 0.50, drop: 0.50, loweredDrop: 1.30,
};

// Temporary furniture footprints, measured in metres. Positions follow the
// simplified room polygons; products, service points and clearances are not final.
export const bedroomBeds = [
  // Pillow end faces the solid west/east wall; double beds keep both sides clear.
  { roomId: "master", center: [11.365, 6.90] as Point, rotation: Math.PI / 2, width: 1.8 },
  { roomId: "parents", center: [9.035, 6.93] as Point, rotation: -Math.PI / 2, width: 1.5 },
  // Single bed: head against the west wall, long side near the north window.
  { roomId: "study", center: [8.76, 2.05] as Point, rotation: Math.PI / 2, width: 1.2 },
] as const;

export const bedroomStorage = [
  { roomId: "master", bedside: { center: [10.52, 5.72] as Point, rotation: Math.PI / 2 },
    wardrobe: { center: [13.18, 3.03] as Point, rotation: -Math.PI / 2, width: 1.7, depth: 0.58 } },
  { roomId: "parents", bedside: { center: [9.88, 5.90] as Point, rotation: -Math.PI / 2 },
    // Shallow storage candidate, requiring sideways hanging rather than a full-depth rail.
    wardrobe: { center: [7.11, 7.30] as Point, rotation: Math.PI / 2, width: 1.6, depth: 0.42 } },
  { roomId: "study", bedside: { center: [7.94, 2.92] as Point, rotation: Math.PI / 2 },
    wardrobe: { center: [8.40, 3.89] as Point, rotation: Math.PI, width: 1.4, depth: 0.50 } },
] as const;

// Keep the original room ID so saved notes and photo links still point here.
export const homeOfficeFurniture = {
  roomId: "guest",
  desk: { center: [0.48, 7.45] as Point, rotation: Math.PI / 2, width: 1.5, depth: 0.7, height: 0.75 },
  chair: { center: [1.23, 7.45] as Point, rotation: -Math.PI / 2, radius: 0.32 },
  cabinet: { center: [0.31, 5.98] as Point, rotation: Math.PI / 2, width: 0.9, depth: 0.38, height: 1.85 },
};

export const bathroomVanitySize = { width: 0.68, depth: 0.48, sideInset: 0.003, backInset: 0.004 };

// Both bathrooms enter from the south. Keep the existing door openings clear:
// basin and toilet along the west wall, then a glazed shower at the far end.
export const bathroomFittings = rooms.filter((room) => room.kind === "bathroom").map((room) => {
  const xs = room.polygon.map(([x]) => x), zs = room.polygon.map(([, z]) => z);
  const west = Math.min(...xs) + 0.1, east = Math.max(...xs) - 0.1;
  const north = Math.min(...zs) + 0.1, south = Math.max(...zs) - 0.1;
  const showerDepth = 0.9, partitionZ = north + showerDepth;
  return {
    roomId: room.id,
    // Mount the back on the west wall, and the basin's left edge against the
    // perpendicular south return wall visible to the left when facing the mirror.
    vanity: { center: [west + bathroomVanitySize.depth / 2, south - bathroomVanitySize.width / 2] as Point,
      rotation: Math.PI / 2 },
    toilet: { center: [west + 0.34, partitionZ + 0.55] as Point, rotation: Math.PI / 2,
      kind: room.id === "bath" ? "squat" as const : "seated" as const },
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
  // Tuck into the south-east corner, facing the entry aisle rather than the hob.
  fridge: { center: [2.12, 3.27] as Point, rotation: Math.PI, width: 0.6, depth: 0.6, height: 1.82 },
  cooktopOffset: 0.95,
  sinkOffset: -0.75,
};

export const diningFurniture = {
  center: [4.25, 2.65] as Point,
  width: 1.35,
  depth: 0.8,
  chairs: [
    // Tucked under the long sides, between the table legs.
    { x: -0.30, z: -0.48, rotation: 0 },
    { x: 0.30, z: -0.48, rotation: 0 },
    { x: -0.30, z: 0.48, rotation: Math.PI },
    { x: 0.30, z: 0.48, rotation: Math.PI },
  ],
};

// Tall and short feather-leaf trees, kept at the sides of the balcony entrance.
export const balconyFurniture = {
  plants: [
    { center: [6.22, 9.25] as Point, height: 1.95, canopyRadius: 0.43, potRadius: 0.21, potHeight: 0.38, seed: 42 },
    { center: [3.1, 9.25] as Point, height: 1.25, canopyRadius: 0.30, potRadius: 0.16, potHeight: 0.29, seed: 76 },
  ],
};
export const televisionSideDecor = {
  cabinet: { center: [-1.20, 0] as Point, width: 0.50, depth: 0.40, height: 0.95 },
  // Same depth line as the TV cabinet; keep a compact crown clear of the tower AC.
  plant: { center: [1.03, 0] as Point, height: 1.10, canopyRadius: 0.18, potRadius: 0.11, potHeight: 0.23, seed: 140 },
};
export const balconyEntryDoor = { center: [4.7, 8.65] as Point, width: 4, height: 2.35 };

export const roomCurtains = [
  { roomId: "guest", center: [1.3, 8.46] as Point, width: 2.15 },
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

// Lighting previews use room/table positions; these are not surveyed wiring points.
export const ceilingLighting: readonly {
  id: string; roomId: string; kind: "round" | "panel" | "pendant" | "downlights";
  fixtures: readonly Point[]; color: string; power: number;
}[] = [
  { id: "master", roomId: "master", kind: "round", fixtures: [[11.8, 6.75]], color: "#ffe0ae", power: 2 },
  { id: "parents", roomId: "parents", kind: "round", fixtures: [[8.5, 6.9]], color: "#ffe0ae", power: 2 },
  { id: "study", roomId: "study", kind: "round", fixtures: [[8.9, 2.7]], color: "#ffe0ae", power: 1.6 },
  { id: "guest", roomId: "guest", kind: "round", fixtures: [[1.3, 6.9]], color: "#fff0d8", power: 1.8 },
  { id: "kitchen", roomId: "kitchen", kind: "panel", fixtures: [[1.7, 1.85]], color: "#fff0d8", power: 1.8 },
  { id: "bath", roomId: "bath", kind: "panel", fixtures: [[6.7, 2.8]], color: "#fff0d8", power: 1.6 },
  { id: "ensuite", roomId: "ensuite", kind: "panel", fixtures: [[11.1, 2.8]], color: "#fff0d8", power: 1.6 },
  { id: "utility", roomId: "utility", kind: "round", fixtures: [[3.6, 0.6]], color: "#fff0d8", power: 1.3 },
  { id: "balcony", roomId: "balcony", kind: "round", fixtures: [[4.7, 9.25]], color: "#ffe0ae", power: 1.3 },
  { id: "dining", roomId: "living", kind: "pendant", fixtures: [[4.25, 2.65]], color: "#ffe0ae", power: 1.8 },
  { id: "entry", roomId: "living", kind: "round", fixtures: [[1.3, 4.42]], color: "#ffe0ae", power: 1.2 },
  { id: "hallway", roomId: "living", kind: "downlights", fixtures: [[8.4, 4.7]], color: "#ffe0ae", power: 1.2 },
  { id: "living-west", roomId: "living", kind: "downlights",
    fixtures: [[3.25, 5.65], [3.25, 6.75], [3.25, 7.85]], color: "#ffe0ae", power: 2.4 },
  { id: "living-east", roomId: "living", kind: "downlights",
    fixtures: [[6.15, 5.65], [6.15, 6.75], [6.15, 7.85]], color: "#ffe0ae", power: 2.4 },
];
