import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createBathroomMirror } from "./mirrors.ts";

test("正交视角使用反射相机，反射时隐藏其他镜子，结束后恢复渲染状态", () => {
  const mirrors: ReturnType<typeof createBathroomMirror>[] = [];
  const first = createBathroomMirror(0.68, 0.82, mirrors);
  const second = createBathroomMirror(0.68, 0.82, mirrors);
  mirrors.push(first, second);
  const scene = new THREE.Scene();
  scene.add(first, second);
  scene.updateMatrixWorld(true);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  let passes = 0, target: THREE.WebGLRenderTarget | null = null;
  const rendererStub = {
    xr: { enabled: true }, shadowMap: { autoUpdate: true },
    state: { buffers: { depth: { setMask() {} } } },
    getRenderTarget: () => target,
    setRenderTarget: (next: THREE.WebGLRenderTarget | null) => { target = next; },
    render: (_scene: THREE.Scene, reflected: THREE.Camera) => {
      passes++;
      assert.equal(first.visible, false);
      assert.equal(second.visible, false);
      assert.ok(reflected instanceof THREE.OrthographicCamera);
      assert.equal(reflected.position.z, -5);
      assert.ok(reflected.projectionMatrix.elements.every(Number.isFinite));
    },
  };
  const renderer = rendererStub as unknown as THREE.WebGLRenderer;
  const material = Array.isArray(first.material) ? first.material[0] : first.material;
  first.onBeforeRender(renderer, scene, camera, first.geometry, material, null!);
  assert.equal(passes, 1);
  assert.equal(first.visible, true);
  assert.equal(second.visible, true);
  assert.equal(target, null);
  assert.equal(rendererStub.xr.enabled, true);
  assert.equal(rendererStub.shadowMap.autoUpdate, true);

  // A back-facing mirror skips reflection, preserving previously hidden peers.
  second.visible = false;
  camera.position.z = -5;
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  first.onBeforeRender(renderer, scene, camera, first.geometry, material, null!);
  assert.equal(passes, 1);
  assert.equal(second.visible, false);
  let disposed = 0;
  for (const mirror of mirrors) {
    mirror.getRenderTarget().addEventListener("dispose", () => { disposed++; });
    mirror.dispose();
    mirror.geometry.dispose();
  }
  assert.equal(disposed, 2);
});
