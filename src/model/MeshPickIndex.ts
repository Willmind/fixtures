import { Mesh } from "three";
import type { Object3D } from "three";

/** Cache topology, not visibility: moving leaves and hidden layouts stay accurate. */
export class MeshPickIndex {
  private entries?: { mesh: Mesh; ancestors: Object3D[] }[];
  invalidate() { this.entries = undefined; }

  visibleMeshes(roots: readonly Object3D[]) {
    if (!this.entries) {
      this.entries = [];
      for (const root of roots) root.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        const ancestors: Object3D[] = [];
        for (let parent: Object3D | null = object; parent; parent = parent.parent) ancestors.push(parent);
        this.entries!.push({ mesh: object, ancestors });
      });
    }
    return this.entries.filter(({ ancestors }) => ancestors.every((object) => object.visible)).map(({ mesh }) => mesh);
  }
}
