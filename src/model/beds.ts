export function storageBed(width: number, roomId: string) {
  const sides = roomId === "study" ? [1] : [-1, 1];
  const frameWidth = width + 0.1;
  const drawerDepth = sides.length === 1 ? frameWidth - 0.08 : frameWidth / 2 - 0.05;
  return {
    frameWidth, length: 2.1, sides, drawerDepth, drawerWidth: 0.96,
    travel: Math.min(0.58, drawerDepth - 0.08),
    drawers: sides.flatMap((side) => [-0.52, 0.52].map((z) => ({
      side, z, closedX: side * (frameWidth / 2 - drawerDepth / 2),
    }))),
  };
}
