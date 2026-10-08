import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createBathroomMirror } from "./mirrors.ts";

test("纯色镜面在三维和俯视相机下不触发额外渲染，也不受灯光和曝光影响", () => {
  const mirror = createBathroomMirror(0.68, 0.82);
  const scene = new THREE.Scene();
  scene.add(mirror);
  const renderer = new Proxy({}, {
    get() { assert.fail("纯色镜面不应操作渲染器或创建反射渲染目标"); },
  }) as THREE.WebGLRenderer;
  try {
    for (const camera of [new THREE.PerspectiveCamera(), new THREE.OrthographicCamera()]) {
      mirror.onBeforeRender(renderer, scene, camera, mirror.geometry, mirror.material, null!);
      assert.equal(mirror.visible, true);
    }
    assert.ok(mirror.material instanceof THREE.MeshBasicMaterial);
    assert.equal(mirror.material.toneMapped, false);
    assert.equal(mirror.material.map, null);
    assert.equal(mirror.material.transparent, false);
  } finally {
    mirror.geometry.dispose();
    mirror.material.dispose();
  }
});
