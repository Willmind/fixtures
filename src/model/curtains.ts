import * as THREE from "three";

/** A sewn panel: gathered at the heading, fuller and gently uneven at the hem.
 * Height stays normalized so it follows the model's adjustable ceiling. */
export function createCurtainPanel(width: number, side: number, closed = false, folds = Math.max(4, Math.round(width / 0.105))) {
  const columns = 56, rows = 28;
  const stride = columns + 1;
  const faceSize = stride * (rows + 1);
  const positions: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = [];

  for (const face of [1, -1]) {
    for (let row = 0; row <= rows; row++) {
      const drop = row / rows;
      const spread = closed ? 1 : 0.84 + 0.16 * Math.sin(drop * Math.PI / 2);
      for (let column = 0; column <= columns; column++) {
        const u = column / columns;
        const phase = u * Math.PI * 2 * folds;
        const drift = Math.sin(drop * Math.PI) * (0.17 * Math.sin(u * 7 + side));
        const amplitude = (closed ? 0.024 : 0.031) + 0.014 * drop;
        const fold = Math.cos(phase + drift) + 0.14 * Math.cos(phase * 2 + 0.4);
        // The outside edge stays by the jamb while the free edge opens out.
        const x = (u - 0.5) * width * spread + side * width * (1 - spread) / 2;
        const y = 1 - drop * 0.982 + Math.pow(drop, 8) * 0.0015 * Math.sin(phase + 0.6);
        const z = amplitude * fold + 0.006 * Math.sin(drop * Math.PI) * Math.sin(u * 9 + side);
        positions.push(x, y, z + face * 0.0015);
        // Physical-scale weave shared by every panel, with no image download.
        uvs.push(u * width * 12, drop * 2.68 * 12);
        const seam = drop < 0.06 || drop > 0.965 || u < 0.025 || u > 0.975;
        const shade = seam ? 0.95 : 1;
        colors.push(shade, shade, shade);
      }
    }
  }

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const a = row * stride + column, b = a + stride, c = b + 1, d = a + 1;
      indices.push(a, b, d, b, c, d);
      indices.push(a + faceSize, d + faceSize, b + faceSize,
        b + faceSize, d + faceSize, c + faceSize);
    }
  }
  // Join the front and lining along all four edges; no paper-thin silhouette.
  const rim: number[] = [];
  for (let column = 0; column <= columns; column++) rim.push(column);
  for (let row = 1; row <= rows; row++) rim.push(row * stride + columns);
  for (let column = columns - 1; column >= 0; column--) rim.push(rows * stride + column);
  for (let row = rows - 1; row > 0; row--) rim.push(row * stride);
  for (let index = 0; index < rim.length; index++) {
    const a = rim[index], b = rim[(index + 1) % rim.length];
    indices.push(a, b, a + faceSize, b, b + faceSize, a + faceSize);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Precompute both shapes once; the GPU unfolds them without rebuilding meshes. */
export function createSlidingCurtainPanel(windowWidth: number, side: number) {
  const openWidth = Math.min(0.64, windowWidth * 0.25);
  const closedWidth = windowWidth / 2;
  const folds = Math.max(4, Math.round(openWidth / 0.105));
  const open = createCurtainPanel(openWidth, side, false, folds);
  const closed = createCurtainPanel(closedWidth, side, true, folds);
  open.translate(side * (windowWidth - openWidth) / 2, 0, 0);
  closed.translate(side * (windowWidth - closedWidth) / 2, 0, 0);
  open.morphAttributes.position = [closed.getAttribute("position")];
  open.morphAttributes.normal = [closed.getAttribute("normal")];
  open.computeBoundingBox();
  open.computeBoundingSphere();
  closed.dispose();
  return open;
}

export class CurtainTransition {
  value = 0;
  closed = false;
  private from = 0;
  private startedAt = 0;
  private duration = 0;

  toggle(now: number, reducedMotion = false) {
    this.advance(now);
    this.closed = !this.closed;
    this.from = this.value;
    this.startedAt = now;
    this.duration = reducedMotion ? 0 : 550 * Math.abs(Number(this.closed) - this.from);
    this.advance(now);
  }

  advance(now: number) {
    const fraction = this.duration ? THREE.MathUtils.clamp((now - this.startedAt) / this.duration, 0, 1) : 1;
    const eased = fraction * fraction * (3 - 2 * fraction);
    this.value = THREE.MathUtils.lerp(this.from, Number(this.closed), eased);
    return fraction < 1;
  }
}

export function createCurtainWeave() {
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const warp = Math.cos(x * Math.PI / 2);
      const weft = Math.cos(y * Math.PI / 2);
      const value = Math.round(128 + warp * 14 + weft * 10);
      const index = (y * size + x) * 4;
      data[index] = data[index + 1] = data[index + 2] = value;
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
