import { walls } from "./plan.ts";

// Opening directions are furnishing previews, not surveyed hinge positions.
const placements = [
  { wallId: "entry", kind: "entry", hinge: "start", swing: 1 },
  { wallId: "guest-north", kind: "room", hinge: "end", swing: 1 },
  { wallId: "bedroom-a-north", kind: "room", hinge: "start", swing: -1 },
  { wallId: "study-south", kind: "room", hinge: "end", swing: -1 },
  { wallId: "master-entry", kind: "room", hinge: "end", swing: -1 },
  { wallId: "bath-south", kind: "bathroom", hinge: "end", swing: -1 },
  { wallId: "ensuite-south", kind: "bathroom", hinge: "end", swing: -1 },
  { wallId: "kitchen-east", kind: "sliding", hinge: "start", swing: 1 },
] as const;

export const homeDoors = placements.map((placement) => {
  const wall = walls.find(({ id }) => id === placement.wallId)!;
  const opening = wall.openings!.find(({ kind }) => kind === "door")!;
  return { ...placement, wall, opening,
    rotation: -Math.atan2(wall.to[1] - wall.from[1], wall.to[0] - wall.from[0]),
    frame: 0.038, gap: 0.006,
  };
});

export const entryCorridor = {
  // Only a short, illustrative landing outside the existing front door.
  from: [-1.9, 3.2] as const,
  to: [0, 6.35] as const,
  shoeCabinet: { center: [-0.28, 5.7] as const, rotation: -Math.PI / 2,
    width: 1, depth: 0.32, height: 1.1 },
};
