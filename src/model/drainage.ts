import { bathroomFittings } from "./arrangements.ts";
import { rooms } from "./plan.ts";
import type { Point } from "./plan.ts";

export type DrainageZone = {
  id: string; roomId: string; label: string;
  bounds: { west: number; east: number; north: number; south: number };
  drain: Point; slope: number; topElevation: number;
  candidate: boolean;
};

// Finished-floor previews, not surveyed outlets or drainage pipe designs.
export const drainageZones: DrainageZone[] = bathroomFittings.flatMap((fitting) => {
  const room = rooms.find(({ id }) => id === fitting.roomId)!;
  const xs = room.polygon.map(([x]) => x), zs = room.polygon.map(([, z]) => z);
  const bounds = { west: Math.min(...xs), east: Math.max(...xs), north: Math.min(...zs), south: Math.max(...zs) };
  const partition = fitting.enclosure.center[1];
  return [
    { id: `${room.id}-wet`, roomId: room.id, label: "淋浴区", bounds: { ...bounds, south: partition },
      drain: [bounds.west + 0.33, bounds.north + 0.33] as Point, slope: 0.015, topElevation: -0.020, candidate: false },
    { id: `${room.id}-dry`, roomId: room.id, label: "干区 · 候选地漏", bounds: { ...bounds, north: partition },
      drain: [bounds.east - 0.45, partition + 0.45] as Point, slope: 0.01, topElevation: -0.008, candidate: true },
  ];
});
drainageZones.push(
  { id: "balcony", roomId: "balcony", label: "主阳台 · 候选地漏",
    bounds: { west: 2.6, east: 6.8, north: 8.65, south: 9.85 },
    drain: [6.42, 9.58], slope: 0.01, topElevation: 0, candidate: true },
  { id: "kitchen", roomId: "kitchen", label: "厨房 · 候选地漏",
    bounds: { west: 0.6, east: 2.6, north: 0, south: 3.7 },
    drain: [1.55, 2.80], slope: 0.01, topElevation: 0, candidate: true },
);

export const floorDrainSize = 0.16;
const rise = (distance: number, slope: number) =>
  slope * distance + (0.04 - slope) * Math.min(distance, 0.05);

/** Four sloping planes meet the square grate. The last 50 mm are steeper.
 * No surface rises above its doorway datum; the grate is always the low point. */
export function drainageElevation(zone: DrainageZone, point: Point) {
  const { bounds: b, drain: [x, z], slope } = zone;
  const farthest = Math.max(Math.abs(b.west - x), Math.abs(b.east - x), Math.abs(b.north - z), Math.abs(b.south - z));
  const distance = Math.max(0, Math.max(Math.abs(point[0] - x), Math.abs(point[1] - z)) - floorDrainSize / 2);
  return zone.topElevation - rise(farthest - floorDrainSize / 2, slope) + rise(distance, slope);
}

export function floorElevation(roomId: string, point: Point) {
  const zone = drainageZones.find((zone) => zone.roomId === roomId
    && point[0] >= zone.bounds.west && point[0] <= zone.bounds.east
    && point[1] >= zone.bounds.north && point[1] <= zone.bounds.south);
  return zone ? drainageElevation(zone, point) : 0;
}
