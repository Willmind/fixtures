import * as THREE from "three";
import { modelCenter } from "./plan.ts";
import type { Point } from "./plan.ts";

export const squatPanSize = { width: 0.46, depth: 0.68, openingWidth: 0.22, openingDepth: 0.44, drop: 0.105 };

/** Hole in the model's XY floor shape; matches the ceramic pan's actual opening. */
export function squatFloorHole(center: Point, rotation: number, origin: Point = modelCenter) {
  const path = new THREE.Path();
  for (let i = 0; i <= 40; i++) {
    const angle = i / 40 * Math.PI * 2;
    const x = Math.cos(angle) * squatPanSize.openingWidth / 2;
    const z = Math.sin(angle) * squatPanSize.openingDepth / 2;
    const worldX = center[0] + Math.cos(rotation) * x + Math.sin(rotation) * z - origin[0];
    const worldZ = -(center[1] - Math.sin(rotation) * x + Math.cos(rotation) * z - origin[1]);
    if (i === 0) path.moveTo(worldX, worldZ); else path.lineTo(worldX, worldZ);
  }
  path.closePath();
  return path;
}

export function createSquatPan(material: THREE.Material) {
  const group = new THREE.Group();
  group.name = "white-recessed-squat-pan";
  const add = (geometry: THREE.BufferGeometry) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const { width, depth, openingWidth, openingDepth, drop } = squatPanSize;
  const w = width / 2, d = depth / 2, radius = 0.055;
  const rim = new THREE.Shape();
  rim.moveTo(-w + radius, -d); rim.lineTo(w - radius, -d);
  rim.quadraticCurveTo(w, -d, w, -d + radius); rim.lineTo(w, d - radius);
  rim.quadraticCurveTo(w, d, w - radius, d); rim.lineTo(-w + radius, d);
  rim.quadraticCurveTo(-w, d, -w, d - radius); rim.lineTo(-w, -d + radius);
  rim.quadraticCurveTo(-w, -d, -w + radius, -d);
  rim.holes.push(squatFloorHole([0, 0], 0, [0, 0]));
  const rimGeometry = new THREE.ExtrudeGeometry(rim, { depth: 0.02, bevelEnabled: false });
  rimGeometry.rotateX(-Math.PI / 2); rimGeometry.translate(0, -0.008, 0);
  add(rimGeometry);
  // White ceramic walls descend below the finished floor; no dark oval overlay.
  const vertices: number[] = [], indices: number[] = [];
  const rings = [[openingWidth / 2, openingDepth / 2, 0.012], [0.078, 0.17, -0.045], [0.038, 0.09, -drop]];
  for (const [x, z, y] of rings) for (let i = 0; i <= 40; i++) {
    const angle = i / 40 * Math.PI * 2;
    vertices.push(Math.cos(angle) * x, y, Math.sin(angle) * z);
  }
  for (let ring = 0; ring < rings.length - 1; ring++) for (let i = 0; i < 40; i++) {
    const a = ring * 41 + i, b = a + 41;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const bowl = new THREE.BufferGeometry();
  bowl.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  bowl.setIndex(indices); bowl.computeVertexNormals();
  add(bowl);
  const bottom = add(new THREE.CircleGeometry(0.038, 32));
  bottom.rotation.x = -Math.PI / 2; bottom.scale.y = 0.09 / 0.038; bottom.position.y = -drop;
  for (const side of [-1, 1]) {
    const pad = add(new THREE.BoxGeometry(0.105, 0.012, 0.40));
    pad.position.set(side * 0.173, 0.017, 0);
    for (let i = 0; i < 8; i++) {
      const rib = add(new THREE.BoxGeometry(0.083, 0.003, 0.007));
      rib.position.set(side * 0.173, 0.0245, -0.161 + i * 0.046);
    }
  }
  return group;
}
