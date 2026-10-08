import * as THREE from "three";

/** Solid, frameless placeholder; no reflection texture or extra scene pass. */
export function createBathroomMirror(width: number, height: number) {
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ color: "#b9c8cc", toneMapped: false, fog: false }));
  mirror.name = "bathroom-frameless-solid-mirror";
  return mirror;
}
