import * as THREE from "three";
import { defaults, rooms } from "./plan.ts";
import type { Room, Wall } from "./plan.ts";

type Finish = "wood" | "white";

export function floorFinish(room: Pick<Room, "kind">): Finish {
  return room.kind === "bathroom" || room.kind === "kitchen" ? "white" : "wood";
}

/** Shared walls get tile only on the kitchen/bathroom side. */
export function wallTileSides(wall: Wall) {
  const dx = wall.to[0] - wall.from[0], dz = wall.to[1] - wall.from[1];
  const length = Math.hypot(dx, dz);
  const offset = (wall.thickness ?? defaults.wallThickness) / 2 + 0.01;
  const tiled = (side: number) => {
    const x = (wall.from[0] + wall.to[0]) / 2 - side * dz / length * offset;
    const z = (wall.from[1] + wall.to[1]) / 2 + side * dx / length * offset;
    return rooms.some((room) => {
      if (room.kind !== "bathroom" && room.kind !== "kitchen") return false;
      let inside = false;
      for (let i = 0, j = room.polygon.length - 1; i < room.polygon.length; j = i++) {
        const [xi, zi] = room.polygon[i], [xj, zj] = room.polygon[j];
        if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
      }
      return inside;
    });
  };
  return { positive: tiled(1), negative: tiled(-1) };
}

/** Metre-based coordinates keep grout spacing consistent across wall openings,
 * cutaway pieces and the small supporting wall behind a bathroom mirror. */
export function applySurfaceUVs(geometry: THREE.BufferGeometry, transform = new THREE.Matrix4()) {
  const positions = geometry.getAttribute("position"), normals = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  const point = new THREE.Vector3(), normal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(transform);
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i).applyMatrix4(transform);
    normal.fromBufferAttribute(normals, i).applyMatrix3(normalMatrix).normalize();
    if (Math.abs(normal.y) > 0.5) uv.setXY(i, point.x, point.z);
    else uv.setXY(i, Math.abs(normal.x) > 0.5 ? point.z : point.x, point.y);
  }
  uv.needsUpdate = true;
}

/** Small local textures: no image downloads, with grout and understated grain. */
export function createTileSurface(finish: Finish, wall = false) {
  const wood = finish === "wood";
  const width = wood ? 1024 : 256, height = wood ? 512 : 256;
  const repeatWidth = wood ? 2.4 : 0.6;
  const repeatHeight = wood ? 0.8 : wall ? 0.3 : repeatWidth;
  const colors = new Uint8Array(width * height * 4), bumps = new Uint8Array(colors.length);
  const base = wood ? [193, 162, 125] : [240, 240, 236];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width, v = (y + 0.5) / height;
      const row = Math.floor(v * 4);
      const plankU = (u * 2 + (row % 2) * 0.5) % 1, plankV = (v * 4) % 1;
      const gap = wood
        ? plankU < 0.0025 / 1.2 || plankV < 0.0025 / 0.2
        : u < 0.0025 / repeatWidth || v < 0.0025 / repeatHeight;
      let variation: number;
      if (wood) {
        const seed = row * 7 + Math.floor(u * 2 + (row % 2) * 0.5) * 11;
        const curve = Math.sin(plankU * 9 + seed) * 1.1 + Math.sin(plankU * 21 + seed) * 0.3;
        variation = Math.sin(plankV * 108 + curve) * 3.5
          + Math.sin(plankV * 257 + curve * 2) * 1.8 + Math.sin(seed * 1.3) * 6;
      } else {
        variation = Math.sin(u * 19 + Math.cos(v * 11)) * 0.7 + Math.cos(v * 31 + u * 7) * 0.5;
      }
      const index = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        colors[index + channel] = gap ? (wood ? [154, 141, 120][channel] : 198) : Math.round(base[channel] + variation);
        bumps[index + channel] = gap ? 75 : Math.round(220 + variation * 0.5);
      }
      colors[index + 3] = bumps[index + 3] = 255;
    }
  }
  const make = (data: Uint8Array, color: boolean) => {
    const texture = new THREE.DataTexture(data, width, height);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1 / repeatWidth, 1 / repeatHeight);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 4;
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  };
  return { map: make(colors, true), bumpMap: make(bumps, false), bumpScale: 0.0015,
    roughness: wall ? 0.48 : finish === "white" ? 0.7 : 0.8 };
}
