import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";

/** Frameless, neutral mirror with one reflection pass per visible surface. */
export function createBathroomMirror(width: number, height: number, mirrors: readonly Reflector[],
  shouldRefresh: () => boolean = () => true) {
  const mirror = new Reflector(new THREE.PlaneGeometry(width, height), {
    // Neutral overlay preserves the reflected room's original colours.
    color: new THREE.Color().setRGB(0.5, 0.5, 0.5),
    // The backing is only 0.5 mm behind the surface. A clipping bias lets
    // that white board into the reflection and completely hides the room.
    textureWidth: 256, textureHeight: 256, multisample: 0, clipBias: 0,
  });
  mirror.name = "bathroom-frameless-reflective-mirror";
  const reflect = mirror.onBeforeRender.bind(mirror);
  mirror.onBeforeRender = (...args) => {
    if (!shouldRefresh()) return;
    // A room view must reflect the same room layers as its main camera.
    mirror.getReflectionCamera(args[2]).layers.mask = args[2].layers.mask;
    // Keep the two bathrooms from recursively rendering one another's mirrors.
    const others = mirrors.filter((other) => other !== mirror);
    const visibility = others.map((other) => other.visible);
    others.forEach((other) => { other.visible = false; });
    try { reflect(...args); }
    finally { others.forEach((other, index) => { other.visible = visibility[index]; }); }
  };
  return mirror;
}
