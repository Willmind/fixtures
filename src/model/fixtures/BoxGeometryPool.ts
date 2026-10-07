import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/** Scene-scoped reuse. Geometry using world-space tile UVs must stay independent. */
export class BoxGeometryPool {
  private geometries = new Map<string, THREE.BufferGeometry>();

  get(size: readonly [number, number, number], radius = 0, uniqueUVs = false) {
    const create = () => radius
      ? new RoundedBoxGeometry(...size, 2, radius)
      : new THREE.BoxGeometry(...size);
    if (uniqueUVs) return create();
    const key = `${size.join(",")}:${radius}`;
    let geometry = this.geometries.get(key);
    if (!geometry) {
      geometry = create();
      this.geometries.set(key, geometry);
    }
    return geometry;
  }

  // HomeScene disposes every reachable geometry once; this only releases cache refs.
  clear() { this.geometries.clear(); }
}
