import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createBathroomMirror } from "./mirrors.ts";

test("反射裁剪排除紧贴镜面背后的白色底板，同时保留镜前物体", () => {
  for (const camera of [
    new THREE.OrthographicCamera(-10, 10, 8, -8, 0.1, 150),
    new THREE.PerspectiveCamera(50, 1.5, 0.1, 150),
  ]) {
    const mirror = createBathroomMirror(0.68, 0.82, []);
    const scene = new THREE.Scene();
    scene.add(mirror);
    scene.updateMatrixWorld(true);
    camera.position.set(10.1, 19, 21);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const renderer = {
      xr: { enabled: false }, shadowMap: { autoUpdate: false },
      state: { buffers: { depth: { setMask() {} } } },
      getRenderTarget: () => null, setRenderTarget() {},
      render: (_scene: THREE.Scene, reflected: THREE.Camera) => {
        const project = (z: number) => new THREE.Vector3(0, 0, z)
          .applyMatrix4(reflected.matrixWorldInverse).applyMatrix4(reflected.projectionMatrix).z;
        // The actual vanity backing ends just 0.5 mm behind the mirror plane.
        assert.ok(project(-0.0005) < -1, `${camera.type}: 底板必须在反射近裁剪面之外`);
        assert.ok(project(0.03) > -1, `${camera.type}: 镜前物体必须可见`);
      },
    } as unknown as THREE.WebGLRenderer;
    const material = Array.isArray(mirror.material) ? mirror.material[0] : mirror.material;
    try { mirror.onBeforeRender(renderer, scene, camera, mirror.geometry, material, null!); }
    finally { mirror.dispose(); mirror.geometry.dispose(); }
  }
});

test("正交视角使用反射相机，反射时隐藏其他镜子，结束后恢复渲染状态", () => {
  const mirrors: ReturnType<typeof createBathroomMirror>[] = [];
  let refresh = true;
  const first = createBathroomMirror(0.68, 0.82, mirrors, () => refresh);
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

  refresh = false;
  first.onBeforeRender(renderer, scene, camera, first.geometry, material, null!);
  assert.equal(passes, 1, "复用反射贴图时不能重新渲染场景");
  assert.equal(first.visible, true);
  assert.equal(second.visible, true);
  assert.equal(target, null);
  refresh = true;

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
