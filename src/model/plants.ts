import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export type PottedTreeSize = {
  height: number; canopyRadius: number; potRadius: number; potHeight: number; seed: number;
};
type TreeMaterials = {
  bark: THREE.Material; foliage: THREE.Material; pot: THREE.Material; soil: THREE.Material;
};

// A gently folded, pointed leaflet. Its centre ridge stays lighter than the edges.
function leafletGeometry() {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  for (let row = 0; row <= 6; row++) {
    const t = row / 6, width = Math.sin(Math.PI * t) * 0.21;
    for (let column = -1; column <= 1; column++) {
      positions.push(column * width, Math.sin(Math.PI * t) * (column === 0 ? 0.07 : -0.02) - t * t * 0.1, t);
      const shade = column === 0 ? 1 : 0.82;
      colors.push(shade, shade, shade);
    }
  }
  for (let row = 0; row < 6; row++) for (let column = 0; column < 2; column++) {
    const a = row * 3 + column, b = a + 3;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createPottedTree(size: PottedTreeSize, materials: TreeMaterials) {
  const { height, canopyRadius: radius, potRadius: r, potHeight: h } = size;
  const tree = new THREE.Group();
  tree.name = "feather-leaf-potted-tree";
  let seed = size.seed;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
    const part = new THREE.Mesh(geometry, material);
    part.castShadow = part.receiveShadow = true;
    tree.add(part);
    return part;
  };
  // A hollow terracotta pot with a rolled lip, visible soil and a shallow saucer.
  mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0.025), new THREE.Vector2(r * 0.67, 0.025),
    new THREE.Vector2(r * 0.70, 0.05), new THREE.Vector2(r * 0.98, h - 0.055),
    new THREE.Vector2(r * 1.04, h - 0.05), new THREE.Vector2(r * 1.04, h - 0.012),
    new THREE.Vector2(r * 0.99, h), new THREE.Vector2(r * 0.89, h),
    new THREE.Vector2(r * 0.88, h - 0.035), new THREE.Vector2(r * 0.63, 0.06),
    new THREE.Vector2(0, 0.06),
  ], 32), materials.pot);
  mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(r * 1.12, 0),
    new THREE.Vector2(r * 1.15, 0.028), new THREE.Vector2(r * 1.1, 0.045),
    new THREE.Vector2(r * 1.05, 0.028), new THREE.Vector2(0, 0.028),
  ], 32), materials.pot);
  const soil = mesh(new THREE.CircleGeometry(r * 0.88, 32), materials.soil);
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = h - 0.035;

  const wood: THREE.BufferGeometry[] = [], stems: THREE.BufferGeometry[] = [];
  const branch = (points: THREE.Vector3[], thickness: number, destination: THREE.BufferGeometry[]) => {
    const curve = new THREE.CatmullRomCurve3(points);
    const segments = points.length === 2 ? 3 : 12, sides = 6;
    const geometry = new THREE.TubeGeometry(curve, segments, 1, sides, false);
    const positions = geometry.getAttribute("position");
    for (let ring = 0; ring <= segments; ring++) {
      const centre = curve.getPointAt(ring / segments);
      const taper = thickness * (1 - ring / segments * 0.7);
      for (let side = 0; side <= sides; side++) {
        const index = ring * (sides + 1) + side;
        positions.setXYZ(index, centre.x + (positions.getX(index) - centre.x) * taper,
          centre.y + (positions.getY(index) - centre.y) * taper,
          centre.z + (positions.getZ(index) - centre.z) * taper);
      }
    }
    geometry.computeVertexNormals();
    destination.push(geometry);
    return curve;
  };
  const trunk = branch([
    new THREE.Vector3(0, h - 0.04, 0), new THREE.Vector3(-radius * 0.09, height * 0.37, radius * 0.035),
    new THREE.Vector3(radius * 0.06, height * 0.57, -radius * 0.07),
    new THREE.Vector3(-radius * 0.035, height * 0.79, radius * 0.025),
  ], r * 0.13, wood);
  const leafMatrices: THREE.Matrix4[] = [], leafColors: THREE.Color[] = [];
  const transform = new THREE.Object3D();
  const addLeaf = (origin: THREE.Vector3, direction: THREE.Vector3, length: number) => {
    transform.position.copy(origin);
    transform.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.clone().normalize());
    transform.rotateZ((random() - 0.5) * 0.9);
    transform.scale.setScalar(length);
    transform.updateMatrix();
    leafMatrices.push(transform.matrix.clone());
    const young = random() > 0.91;
    leafColors.push(new THREE.Color().setHSL(young ? 0.21 : 0.26 + random() * 0.055,
      young ? 0.43 : 0.32 + random() * 0.15, 0.24 + random() * 0.18));
  };
  // Irregular branches carry feather-like compound fronds rather than oval blobs.
  for (let b = 0; b < 9; b++) {
    const angle = b * 2.4 + random() * 0.35;
    const root = trunk.getPointAt(0.30 + b / 9 * 0.57);
    const tip = new THREE.Vector3(Math.cos(angle) * radius * 0.38,
      height * (0.59 + b / 9 * 0.32), Math.sin(angle) * radius * 0.38);
    const mid = root.clone().lerp(tip, 0.5); mid.y += 0.06;
    branch([root, mid, tip], r * (0.035 + (9 - b) * 0.002), wood);
    for (let f = 0; f < 3; f++) {
      const heading = angle + (f - 1) * 1.15 + (random() - 0.5) * 0.25;
      const direction = new THREE.Vector3(Math.cos(heading), 0, Math.sin(heading));
      const side = new THREE.Vector3(-direction.z, 0, direction.x);
      const length = radius * (0.36 + random() * 0.09);
      const start = tip.clone(); start.y += (f - 1) * 0.035;
      const end = start.clone().addScaledVector(direction, length); end.y -= length * 0.15;
      const centre = start.clone().lerp(end, 0.5); centre.y += length * 0.16;
      const frond = branch([start, centre, end], 0.0018, stems);
      for (let pin = 1; pin <= 5; pin++) for (const sign of [-1, 1]) {
        const t = pin / 6, base = frond.getPointAt(t);
        const pinLength = radius * 0.18 * Math.sin(Math.PI * t);
        const pinDirection = side.clone().multiplyScalar(sign).addScaledVector(direction, 0.28).normalize();
        const pinTip = base.clone().addScaledVector(pinDirection, pinLength); pinTip.y -= 0.014;
        branch([base, pinTip], 0.0008, stems);
        const leafSide = new THREE.Vector3(-pinDirection.z, 0, pinDirection.x);
        for (let pair = 1; pair <= 4; pair++) for (const leafSign of [-1, 1]) {
          const at = base.clone().lerp(pinTip, pair / 5);
          const axis = leafSide.clone().multiplyScalar(leafSign).addScaledVector(pinDirection, 0.38);
          axis.y = (random() - 0.5) * 0.35;
          addLeaf(at, axis, radius * (0.065 + random() * 0.025) * (1 - pair * 0.055));
        }
        addLeaf(pinTip, pinDirection, radius * 0.07);
      }
    }
  }
  const destinationColor = (green: boolean) => new THREE.Color(green ? "#637944" : "#ffffff");
  for (const [geometries, material] of [[wood, materials.bark], [stems, materials.foliage]] as const) {
    // Tube geometry has no vertex colours; the shared foliage material does.
    for (const geometry of geometries) {
      const color = destinationColor(material === materials.foliage);
      const colors = new Float32Array(geometry.getAttribute("position").count * 3);
      for (let vertex = 0; vertex < colors.length; vertex += 3) colors.set([color.r, color.g, color.b], vertex);
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    }
    mesh(mergeGeometries(geometries), material);
    geometries.forEach((geometry) => geometry.dispose());
  }
  // Thousands of small leaves use one draw call per tree instead of separate meshes.
  const leaves = new THREE.InstancedMesh(leafletGeometry(), materials.foliage, leafMatrices.length);
  leafMatrices.forEach((matrix, index) => {
    leaves.setMatrixAt(index, matrix); leaves.setColorAt(index, leafColors[index]);
  });
  leaves.instanceMatrix.needsUpdate = true;
  leaves.instanceColor!.needsUpdate = true;
  leaves.castShadow = leaves.receiveShadow = true;
  leaves.computeBoundingSphere();
  tree.add(leaves);
  return tree;
}
