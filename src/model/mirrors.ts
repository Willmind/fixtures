import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";

/** Frameless, neutral mirror with one reflection pass per visible surface. */
export function createBathroomMirror(width: number, height: number, mirrors: readonly Reflector[]) {
  const mirror = new Reflector(new THREE.PlaneGeometry(width, height), {
    color: new THREE.Color().setRGB(0.52, 0.53, 0.54),
    textureWidth: 768, textureHeight: 768, multisample: 0, clipBias: 0.003,
  });
  mirror.name = "bathroom-frameless-reflective-mirror";
  const reflect = mirror.onBeforeRender.bind(mirror);
  mirror.onBeforeRender = (...args) => {
    // Keep the two bathrooms from recursively rendering one another's mirrors.
    const others = mirrors.filter((other) => other !== mirror);
    const visibility = others.map((other) => other.visible);
    others.forEach((other) => { other.visible = false; });
    try { reflect(...args); }
    finally { others.forEach((other, index) => { other.visible = visibility[index]; }); }
  };
  return mirror;
}
