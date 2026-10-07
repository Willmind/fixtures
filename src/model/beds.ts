export function storageBed(width: number, roomId: string) {
  const sides = roomId === "study" ? [-1] : [-1, 1];
  const frameWidth = width + 0.1;
  const drawerDepth = sides.length === 1 ? frameWidth - 0.08 : frameWidth / 2 - 0.05;
  return {
    frameWidth, length: 2.1, sides, drawerDepth, drawerWidth: 0.72,
    headPanelLength: 0.44, headPanelZ: -0.82,
    travel: Math.min(0.58, drawerDepth - 0.08),
    // Leave a fixed head-end section so bedside cabinets cannot block a drawer.
    drawers: sides.flatMap((side) => [-0.20, 0.59].map((z) => ({
      side, z, closedX: side * (frameWidth / 2 - drawerDepth / 2),
    }))),
  };
}
