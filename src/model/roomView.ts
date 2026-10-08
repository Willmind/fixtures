import * as THREE from "three";
import { modelCenter, rooms, walls } from "./plan.ts";
import type { Opening, Point, Room, Wall } from "./plan.ts";
import { bayWindows } from "./bayWindows.ts";

export const roomLayer = (id: string) => rooms.findIndex((room) => room.id === id) + 1;
export function roomBounds(room: Room) {
  return { west: Math.min(...room.polygon.map(([x]) => x)), east: Math.max(...room.polygon.map(([x]) => x)),
    north: Math.min(...room.polygon.map(([, z]) => z)), south: Math.max(...room.polygon.map(([, z]) => z)) };
}
/** Include the original window niches outside the room's floor polygon. */
export function roomDisplayBounds(room: Room) {
  const bounds = roomBounds(room);
  for (const bay of bayWindows.filter((item) => item.roomId === room.id)) {
    const wall = walls.find((item) => item.id === bay.wallId)!;
    const dx = wall.to[0] - wall.from[0], dz = wall.to[1] - wall.from[1], length = Math.hypot(dx, dz);
    for (const along of [bay.start, bay.end]) {
      const x = wall.from[0] + dx / length * along - dz / length * bay.outside * bay.projection;
      const z = wall.from[1] + dz / length * along + dx / length * bay.outside * bay.projection;
      bounds.west = Math.min(bounds.west, x); bounds.east = Math.max(bounds.east, x);
      bounds.north = Math.min(bounds.north, z); bounds.south = Math.max(bounds.south, z);
    }
  }
  return bounds;
}
function contains(polygon: readonly Point[], x: number, z: number) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, az] = polygon[j], [bx, bz] = polygon[i];
    const cross = (x - ax) * (bz - az) - (z - az) * (bx - ax);
    if (Math.abs(cross) < 1e-7 && x >= Math.min(ax, bx) && x <= Math.max(ax, bx)
      && z >= Math.min(az, bz) && z <= Math.max(az, bz)) return true;
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}
/** Test a footprint against the actual polygon, including concave rooms and shared walls. */
export function touchesRoom(room: Room, box: { west: number; east: number; north: number; south: number }) {
  const pad = 0.08;
  const w = box.west - pad, e = box.east + pad, n = box.north - pad, s = box.south + pad;
  if ([[w, n], [e, n], [w, s], [e, s]].some(([x, z]) => contains(room.polygon, x, z))) return true;
  for (let i = 0; i < room.polygon.length; i++) {
    const [ax, az] = room.polygon[i], [bx, bz] = room.polygon[(i + 1) % room.polygon.length];
    // Plan walls are axis aligned; this also handles an enclosing footprint.
    if (ax >= w && ax <= e && az >= n && az <= s) return true;
    if (az === bz && az >= n && az <= s && Math.max(ax, bx) >= w && Math.min(ax, bx) <= e) return true;
    if (ax === bx && ax >= w && ax <= e && Math.max(az, bz) >= n && Math.min(az, bz) <= s) return true;
  }
  return false;
}

/** Anchor door/window membership to the opening, never to an animated leaf. */
export function openingRooms(wall: Wall, opening: Opening) {
  const dx = wall.to[0] - wall.from[0], dz = wall.to[1] - wall.from[1], length = Math.hypot(dx, dz);
  const a = [wall.from[0] + dx / length * opening.start, wall.from[1] + dz / length * opening.start];
  const b = [wall.from[0] + dx / length * opening.end, wall.from[1] + dz / length * opening.end];
  const footprint = { west: Math.min(a[0], b[0]), east: Math.max(a[0], b[0]),
    north: Math.min(a[1], b[1]), south: Math.max(a[1], b[1]) };
  return rooms.filter((room) => touchesRoom(room, footprint)).map((room) => room.id);
}

/** Use layers rather than visibility: animation and option visibility remain independent. */
export function indexRoomLayers(roots: readonly THREE.Object3D[]) {
  const box = new THREE.Box3();
  const point = new THREE.Vector3();
  for (const root of roots) {
    root.updateWorldMatrix(true, true);
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Light)
        && !object.userData.roomId && !(object as THREE.Object3D & { isCSS2DObject?: boolean }).isCSS2DObject) return;
      let owner: THREE.Object3D | null = object;
      while (owner && !owner.userData.roomId && !owner.userData.roomIds) owner = owner.parent;
      object.layers.set(0);
      if (owner) {
        const ids: string[] = owner.userData.roomIds ?? [owner.userData.roomId];
        for (const id of ids) if (roomLayer(id) > 0) object.layers.enable(roomLayer(id));
        return;
      }
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.computeBoundingBox();
        box.copy(object.geometry.boundingBox!).applyMatrix4(object.matrixWorld);
      } else {
        object.getWorldPosition(point);
        box.set(point, point);
      }
      const footprint = { west: box.min.x + modelCenter[0], east: box.max.x + modelCenter[0],
        north: box.min.z + modelCenter[1], south: box.max.z + modelCenter[1] };
      for (const room of rooms) if (touchesRoom(room, footprint)) object.layers.enable(roomLayer(room.id));
    });
  }
}

export function roomClipping(room: Room) {
  const b = roomDisplayBounds(room), pad = 0.14;
  return [new THREE.Plane(new THREE.Vector3(1, 0, 0), modelCenter[0] - b.west + pad),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), b.east - modelCenter[0] + pad),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), modelCenter[1] - b.north + pad),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), b.south - modelCenter[1] + pad)];
}

export type CameraPose = { position: THREE.Vector3; target: THREE.Vector3; zoom: number };
export function roomPose(room: Room, camera: THREE.OrthographicCamera, plan: boolean, height: number): CameraPose {
  const b = roomDisplayBounds(room);
  const target = new THREE.Vector3((b.west + b.east) / 2 - modelCenter[0], height * 0.25,
    (b.north + b.south) / 2 - modelCenter[1]);
  const position = target.clone().add(plan ? new THREE.Vector3(0, 24, 0.001) : new THREE.Vector3(12, 17, 20));
  const preview = camera.clone();
  preview.position.copy(position); preview.zoom = 1; preview.lookAt(target); preview.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  for (const x of [b.west, b.east]) for (const z of [b.north, b.south]) for (const y of [0, height])
    bounds.expandByPoint(new THREE.Vector3(x - modelCenter[0], y, z - modelCenter[1]).applyMatrix4(preview.matrixWorldInverse));
  const size = bounds.getSize(new THREE.Vector3());
  return { position, target, zoom: Math.min(4, (camera.right - camera.left) / (size.x * 1.35),
    (camera.top - camera.bottom) / (size.y * 1.5)) };
}

export class RoomCameraMotion {
  private transition?: { from: CameraPose; to: CameraPose; start: number; duration: number; commitScope?: () => void };
  start(from: CameraPose, to: CameraPose, now: number, reduced: boolean, commitScope?: () => void) {
    this.cancel();
    this.transition = { from, to, start: now, duration: reduced ? 0 : 720, commitScope };
  }
  cancel() {
    const transition = this.transition;
    this.transition = undefined;
    transition?.commitScope?.();
  }
  advance(now: number, camera: THREE.OrthographicCamera, target: THREE.Vector3) {
    const t = this.transition;
    if (!t) return false;
    const progress = t.duration ? Math.min(1, Math.max(0, (now - t.start) / t.duration)) : 1;
    // Replace room geometry after the initial pull-back, not before the first frame.
    if (progress >= 0.28 && t.commitScope) {
      const commit = t.commitScope; t.commitScope = undefined; commit();
    }
    const eased = progress * progress * (3 - 2 * progress);
    camera.position.lerpVectors(t.from.position, t.to.position, eased);
    target.lerpVectors(t.from.target, t.to.target, eased);
    const bridgeZoom = Math.min(t.from.zoom, t.to.zoom) * 0.82;
    const zoomProgress = progress < 0.28 ? progress / 0.28 : (progress - 0.28) / 0.72;
    const zoomEase = zoomProgress * zoomProgress * (3 - 2 * zoomProgress);
    camera.zoom = progress < 0.28 ? THREE.MathUtils.lerp(t.from.zoom, bridgeZoom, zoomEase)
      : THREE.MathUtils.lerp(bridgeZoom, t.to.zoom, zoomEase);
    camera.updateProjectionMatrix();
    if (progress === 1) this.transition = undefined;
    return progress < 1;
  }
}
