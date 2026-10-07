import type * as THREE from "three";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { Point } from "../plan.ts";
import type { BoxPart } from "../furniture.ts";

/** Geometry/material ownership stays with HomeFixtures; builders only assemble parts. */
export interface FixtureBuilderContext {
  box(parent: THREE.Group, size: [number, number, number], position: [number, number, number], material: THREE.Material | THREE.Material[], radius?: number): THREE.Mesh;
  at(parent: THREE.Group, point: Point, rotation?: number): THREE.Group;
  part(parent: THREE.Group, part: BoxPart, material: THREE.Material): void;
  pipe(parent: THREE.Group, points: [number, number, number][], radius: number): void;
  tagRoom(group: THREE.Group, roomId: string): void;
  label(parent: THREE.Group, text: string, y: number, kind: string): CSS2DObject;
  material(options: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial;
  materials: {
    cabinet: THREE.MeshStandardMaterial;
    sofa: THREE.MeshStandardMaterial;
    cushion: THREE.MeshStandardMaterial;
    white: THREE.MeshStandardMaterial;
    dark: THREE.MeshStandardMaterial;
    support: THREE.MeshStandardMaterial;
    chairMesh: THREE.MeshStandardMaterial;
    wood: THREE.MeshStandardMaterial;
    wetFloor: THREE.MeshStandardMaterial;
    ceramic: THREE.MeshStandardMaterial;
    steel: THREE.MeshStandardMaterial;
    mirror: THREE.MeshStandardMaterial;
    backdrop: THREE.MeshStandardMaterial;
    windowFrame: THREE.MeshStandardMaterial;
    windowGlass: THREE.MeshStandardMaterial;
    doorGlass: THREE.MeshStandardMaterial;
  };
}
