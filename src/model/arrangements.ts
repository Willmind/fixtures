import { rooms } from "./plan.ts";
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
