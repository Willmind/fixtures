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

const entryDoor = homeDoors.find(({ kind }) => kind === "entry")!;
const entryCenterZ = entryDoor.wall.from[1] + (entryDoor.opening.start + entryDoor.opening.end) / 2;

export const entryCorridor = {
  // Continue straight out from the door, along the x axis; dimensions are illustrative.
  from: [-3.15, entryCenterZ - 1] as const,
  to: [0, entryCenterZ + 1] as const,
  shoeCabinet: { center: [-0.8, entryCenterZ + 1 - 0.06 - 0.16] as const, rotation: Math.PI,
    width: 1, depth: 0.32, height: 1.1 },
};
