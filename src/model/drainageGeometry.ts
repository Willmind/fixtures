import * as THREE from "three";
import { drainageElevation, floorDrainSize } from "./drainage.ts";
import type { DrainageZone } from "./drainage.ts";
import { modelCenter } from "./plan.ts";
import type { Point } from "./plan.ts";

function rectangle(west: number, east: number, north: number, south: number) {
  const shape = new THREE.Shape();
  for (const [i, [x, z]] of ([[west, north], [east, north], [east, south], [west, south]] as Point[]).entries()) {
    if (i === 0) shape.moveTo(x - modelCenter[0], -(z - modelCenter[1]));
    else shape.lineTo(x - modelCenter[0], -(z - modelCenter[1]));
  }
  shape.closePath();
  return shape;
}

/** Subdivide the holed top surface before lowering vertices. This preserves the
 * squat-pan opening and avoids covering the drain with a flat floor triangle. */
export function createDrainageFloor(zone: DrainageZone, holes: THREE.Path[] = []) {
  const b = zone.bounds, half = floorDrainSize / 2;
  const shape = rectangle(b.west, b.east, b.north, b.south);
  shape.holes.push(...holes, rectangle(zone.drain[0] - half, zone.drain[0] + half,
    zone.drain[1] - half, zone.drain[1] + half));
  const source = new THREE.ShapeGeometry(shape);
  const flat = source.toNonIndexed();
  const positions = flat.getAttribute("position");
  const vertices: number[] = [], uv: number[] = [];
  const emit = (a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2, depth: number) => {
    if (depth > 0) {
      const ab = a.clone().add(b).multiplyScalar(0.5), bc = b.clone().add(c).multiplyScalar(0.5), ca = c.clone().add(a).multiplyScalar(0.5);
      emit(a, ab, ca, depth - 1); emit(ab, b, bc, depth - 1);
      emit(ca, bc, c, depth - 1); emit(ab, bc, ca, depth - 1);
    } else for (const p of [a, b, c]) {
      const point: Point = [p.x + modelCenter[0], -p.y + modelCenter[1]];
      vertices.push(p.x, drainageElevation(zone, point), -p.y);
      uv.push(p.x, -p.y);
    }
  };
  for (let i = 0; i < positions.count; i += 3) {
    emit(new THREE.Vector2(positions.getX(i), positions.getY(i)),
      new THREE.Vector2(positions.getX(i + 1), positions.getY(i + 1)),
      new THREE.Vector2(positions.getX(i + 2), positions.getY(i + 2)), 4);
  }
  flat.dispose(); source.dispose();
  // Close the exposed perimeter down to the supporting slab, including the
  // balcony edge, so the finished surface does not look suspended above it.
  const corners: Point[] = [[b.west, b.north], [b.west, b.south], [b.east, b.south], [b.east, b.north]];
  for (let edge = 0; edge < corners.length; edge++) {
    const start = corners[edge], end = corners[(edge + 1) % corners.length];
    for (let step = 0; step < 32; step++) {
      const a: Point = [start[0] + (end[0] - start[0]) * step / 32, start[1] + (end[1] - start[1]) * step / 32];
      const c: Point = [start[0] + (end[0] - start[0]) * (step + 1) / 32, start[1] + (end[1] - start[1]) * (step + 1) / 32];
      const ax = a[0] - modelCenter[0], az = a[1] - modelCenter[1], cx = c[0] - modelCenter[0], cz = c[1] - modelCenter[1];
      const ay = drainageElevation(zone, a), cy = drainageElevation(zone, c);
      vertices.push(ax, ay, az, ax, -0.08, az, cx, cy, cz, cx, cy, cz, ax, -0.08, az, cx, -0.08, cz);
      uv.push(ax, ay, ax, -0.08, cx, cy, cx, cy, ax, -0.08, cx, -0.08);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  return geometry;
}
