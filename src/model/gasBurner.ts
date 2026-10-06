import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { OpenCloseMotion } from "./OpenCloseMotion.ts";

export function createGasFlameMaterial(core = false, phase = 0) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: {
      time: { value: 0 }, motion: { value: 1 }, phase: { value: phase },
      baseColor: { value: new THREE.Color(core ? "#4ccaff" : "#2359ff") },
      tipColor: { value: new THREE.Color(core ? "#c2efff" : "#60bdff") },
      opacity: { value: core ? 0.65 : 0.42 },
    },
    vertexShader: `
      attribute float flameHeight;
      attribute float jetPhase;
      uniform float time;
      uniform float motion;
      uniform float phase;
      varying float vHeight;
      varying float vPulse;
      varying vec3 vNormal;
      varying vec3 vViewDirection;
      void main() {
        float t = time * motion;
        float p = jetPhase + phase;
        float pulse = sin(t * 11.3 + p) * 0.6 + sin(t * 17.7 + p * 1.6) * 0.4;
        vec3 displaced = position;
        displaced.y *= 1.0 + pulse * 0.12 * motion;
        displaced.x += sin(t * 9.1 + p) * 0.003 * flameHeight * flameHeight * motion;
        displaced.z += sin(t * 12.7 + p * 1.3) * 0.002 * flameHeight * flameHeight * motion;
        vHeight = flameHeight;
        vPulse = pulse * motion;
        vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
        vNormal = normalMatrix * normal;
        vViewDirection = -viewPosition.xyz;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 baseColor;
      uniform vec3 tipColor;
      uniform float opacity;
      varying float vHeight;
      varying float vPulse;
      varying vec3 vNormal;
      varying vec3 vViewDirection;
      void main() {
        vec3 color = mix(baseColor, tipColor, smoothstep(0.15, 0.9, vHeight));
        float alpha = opacity * (1.0 - smoothstep(0.45, 1.0, vHeight));
        alpha *= smoothstep(0.0, 0.08, vHeight) * (0.9 + vPulse * 0.1);
        alpha *= pow(abs(dot(normalize(vNormal), normalize(vViewDirection))), 0.55);
        gl_FragColor = vec4(color, alpha);
        #include <colorspace_fragment>
      }
    `,
  });
}

export function createGasFlames(outer: THREE.Material, inner: THREE.Material) {
  const group = new THREE.Group();
  group.name = "blue-gas-flame-ring";
  for (const [material, radius, baseHeight] of [[outer, 0.007, 0.048], [inner, 0.0038, 0.029]] as const) {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 28; i++) {
      const angle = i / 28 * Math.PI * 2;
      const height = baseHeight * (0.93 + 0.09 * Math.sin(i * 2.3));
      // Rounded shoulders and tapering tips replace the rigid cone outline.
      const geometry = new THREE.LatheGeometry([
        new THREE.Vector2(radius * 0.65, 0), new THREE.Vector2(radius, height * 0.13),
        new THREE.Vector2(radius * 0.72, height * 0.45), new THREE.Vector2(radius * 0.3, height * 0.8),
        new THREE.Vector2(0, height),
      ], 10);
      const count = geometry.getAttribute("position").count;
      const fractions = Float32Array.from({ length: count }, (_, index) => geometry.getAttribute("position").getY(index) / height);
      geometry.setAttribute("flameHeight", new THREE.BufferAttribute(fractions, 1));
      geometry.setAttribute("jetPhase", new THREE.BufferAttribute(new Float32Array(count).fill(i * 2.3), 1));
      geometry.rotateZ(0.1);
      geometry.rotateY(-angle);
      geometry.translate(Math.cos(angle) * 0.097, 0, Math.sin(angle) * 0.097);
      parts.push(geometry);
    }
    group.add(new THREE.Mesh(mergeGeometries(parts), material));
    parts.forEach((geometry) => geometry.dispose());
  }
  return group;
}

/** Animate individual gas jets while lit, and stop rendering once extinguished. */
export class GasBurner {
  private motion = new OpenCloseMotion(false);
  private reducedMotion = false;
  private animatedMaterials: THREE.ShaderMaterial[] = [];
  readonly flames: THREE.Group;
  readonly knob: THREE.Group;
  constructor(flames: THREE.Group, knob: THREE.Group) {
    this.flames = flames; this.knob = knob;
    flames.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) if (material instanceof THREE.ShaderMaterial) this.animatedMaterials.push(material);
    });
    this.apply(0);
  }
  get on() { return this.motion.open; }
  toggle(now: number, reducedMotion = false) {
    this.reducedMotion = reducedMotion;
    this.motion.toggle(now, reducedMotion);
    this.apply(now);
  }
  advance(now: number) {
    const moving = this.motion.advance(now);
    this.apply(now);
    return moving || (this.motion.open && !this.reducedMotion);
  }
  private apply(now: number) {
    this.flames.visible = this.motion.value > 0;
    this.flames.scale.y = Math.max(0.001, this.motion.value);
    this.knob.rotation.y = -Math.PI * 0.6 * this.motion.value;
    for (const material of this.animatedMaterials) {
      material.uniforms.time.value = now / 1000;
      material.uniforms.motion.value = Number(!this.reducedMotion);
    }
  }
}
