import type { Opening, Point } from "./plan.ts";

export type WallPiece = {
  start: number;
  end: number;
  bottom: number;
  top: number;
};

/** Subtract real door/window holes instead of drawing dark rectangles on walls. */
export function splitWall(
  length: number,
  height: number,
  openings: readonly Opening[] = [],
): WallPiece[] {
  if (
    !Number.isFinite(length) ||
    !Number.isFinite(height) ||
    length <= 0 ||
    height <= 0
  ) {
    throw new Error("墙体长度和高度必须为正数");
  }
  const sorted = [...openings].sort((a, b) => a.start - b.start);
  let cursor = 0;
  const pieces: WallPiece[] = [];
  const add = (start: number, end: number, bottom: number, top: number) => {
    if (end > start && top > bottom) pieces.push({ start, end, bottom, top });
  };
  for (const opening of sorted) {
    if (
      ![opening.start, opening.end, opening.sill, opening.top].every(
        Number.isFinite,
      ) ||
      opening.start < cursor ||
      opening.end > length + 1e-6 ||
      opening.end <= opening.start ||
      opening.sill < 0 ||
      opening.top <= opening.sill
    ) {
      throw new Error("门窗洞口越界、重叠或尺寸无效");
    }
    add(cursor, opening.start, 0, height);
    add(opening.start, opening.end, 0, Math.min(opening.sill, height));
    add(opening.start, opening.end, Math.min(opening.top, height), height);
    cursor = opening.end;
  }
  add(cursor, length, 0, height);
  return pieces;
}

export function polygonArea(points: readonly Point[]) {
  return (
    Math.abs(
      points.reduce((sum, [x, z], i) => {
        const next = points[(i + 1) % points.length];
        return sum + x * next[1] - next[0] * z;
      }, 0),
    ) / 2
  );
}
