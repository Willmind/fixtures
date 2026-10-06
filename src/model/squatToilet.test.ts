import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { bathroomFittings } from "./arrangements.ts";
import { rooms, modelCenter } from "./plan.ts";
import { createSquatPan, squatFloorHole, squatPanSize } from "./squatToilet.ts";

const material = new THREE.MeshBasicMaterial({ color: "white" });
test("只替换公卫，蹲厕凹槽穿透地面，毛坯模式的地砖覆盖可恢复完整地面", () => {
  const publicBath = bathroomFittings.find(({ roomId }) => roomId === "bath")!;
  assert.equal(publicBath.toilet.kind, "squat");
  assert.equal(bathroomFittings.find(({ roomId }) => roomId === "ensuite")!.toilet.kind, "seated");
  const room = rooms.find(({ id }) => id === "bath")!;
  const shape = new THREE.Shape(room.polygon.map(([x, z]) => new THREE.Vector2(x - modelCenter[0], -(z - modelCenter[1]))));
  const hole = squatFloorHole(publicBath.toilet.center, publicBath.toilet.rotation);
  shape.holes.push(hole);
  const geometry = (shape: THREE.Shape) => {
    const result = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false });
    result.rotateX(-Math.PI / 2); result.translate(0, -0.16, 0);
    return result;
  };
  const floor = new THREE.Mesh(geometry(shape), material);
  const cover = new THREE.Mesh(geometry(new THREE.Shape(hole.getPoints())), material);
  const ray = new THREE.Raycaster(new THREE.Vector3(publicBath.toilet.center[0] - modelCenter[0], 1,
    publicBath.toilet.center[1] - modelCenter[1]), new THREE.Vector3(0, -1, 0));
  assert.equal(ray.intersectObject(floor).length, 0, "地砖不能填住便池凹槽");
  assert.ok(ray.intersectObject(cover).length > 0, "隐藏家具时能够恢复地砖");
  floor.geometry.dispose(); cover.geometry.dispose();
});

test("蹲厕内壁为白色并朝向便池内部，底部在地面以下，踏板略高于地面", () => {
  const pan = createSquatPan(material);
  pan.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(0.06, 1, 0.12), new THREE.Vector3(0, -1, 0));
  const hit = ray.intersectObject(pan)[0];
  assert.ok(hit, "从上方可看到白色凹形内壁");
  assert.ok(hit.point.y < 0 && hit.point.y > -squatPanSize.drop);
  assert.ok(hit.face!.normal.y > 0);
  assert.equal((hit.object as THREE.Mesh).material, material);
  const bounds = new THREE.Box3().setFromObject(pan);
  assert.ok(Math.abs(bounds.min.y + squatPanSize.drop) < 1e-6);
  assert.ok(bounds.max.y > 0 && bounds.max.y < 0.03);
  pan.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
});
