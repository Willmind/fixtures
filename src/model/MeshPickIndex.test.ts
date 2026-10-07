import test from "node:test";
import assert from "node:assert/strict";
import { Group, Mesh, BoxGeometry } from "three";
import { MeshPickIndex } from "./MeshPickIndex.ts";

test("命中缓存跟随所有祖先的可见性，切换家具方案不留下隐藏物体", () => {
  const root = new Group(), layout = new Group(), mesh = new Mesh(new BoxGeometry());
  root.add(layout); layout.add(mesh);
  const index = new MeshPickIndex();
  assert.deepEqual(index.visibleMeshes([root]), [mesh]);
  layout.visible = false;
  assert.deepEqual(index.visibleMeshes([root]), []);
  layout.visible = true; mesh.visible = false;
  assert.deepEqual(index.visibleMeshes([root]), []);
  mesh.visible = true;
  assert.deepEqual(index.visibleMeshes([root]), [mesh]);
  const next = new Mesh(new BoxGeometry());
  layout.remove(mesh); layout.add(next);
  index.invalidate();
  assert.deepEqual(index.visibleMeshes([root]), [next]);
  mesh.geometry.dispose(); next.geometry.dispose();
});
