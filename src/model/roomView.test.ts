import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { rooms, modelCenter } from "./plan.ts";
import { indexRoomLayers, roomLayer, touchesRoom, roomBounds, roomDisplayBounds, roomClipping, roomPose, RoomCameraMotion } from "./roomView.ts";

test("凹形客餐厅范围不会误收包围框内的其他卧室，共用墙属于相邻房间", () => {
  const living = rooms.find((room) => room.id === "living")!;
  assert.equal(touchesRoom(living, { west: 8, east: 9, north: 6, south: 7 }), false);
  assert.equal(touchesRoom(living, { west: 4, east: 5, north: 6, south: 7 }), true);
  const shared = { west: 6.7, east: 6.9, north: 5.15, south: 8.65 };
  assert.equal(touchesRoom(living, shared), true);
  assert.equal(touchesRoom(rooms.find((room) => room.id === "parents")!, shared), true);
});

test("单房间层保留家具手动开合与隐藏状态，灯光继承房间归属", () => {
  const group = new THREE.Group();
  group.userData.roomId = "guest";
  const geometry = new THREE.BoxGeometry(1, 1, 1), material = new THREE.MeshBasicMaterial();
  const door = new THREE.Mesh(geometry, material);
  const light = new THREE.PointLight();
  group.add(door, light);
  // Opened door and switched-off light must not be reset by entering a room.
  door.rotation.y = 1.2; door.position.set(50, 0, 50); light.visible = false;
  indexRoomLayers([group]);
  const camera = new THREE.OrthographicCamera();
  camera.layers.set(roomLayer("guest"));
  assert.ok(door.layers.test(camera.layers));
  assert.ok(light.layers.test(camera.layers));
  camera.layers.set(roomLayer("master"));
  assert.equal(door.layers.test(camera.layers), false);
  camera.layers.set(0);
  assert.ok(door.layers.test(camera.layers), "返回整屋无需重新生成家具");
  assert.equal(light.visible, false);
  assert.equal(door.rotation.y, 1.2);
  geometry.dispose(); material.dispose();
});

test("无房间标记的墙体按世界坐标分配，切片排除远处几何与误触", () => {
  const room = rooms.find((room) => room.id === "parents")!;
  const b = roomBounds(room);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.8, b.south - b.north));
  wall.position.set(b.west - modelCenter[0], 1.4, (b.north + b.south) / 2 - modelCenter[1]);
  indexRoomLayers([wall]);
  assert.ok(wall.layers.isEnabled(roomLayer("parents")));
  assert.ok(wall.layers.isEnabled(roomLayer("living")));
  assert.equal(wall.layers.isEnabled(roomLayer("kitchen")), false);
  const planes = roomClipping(room);
  assert.ok(planes.every((plane) => plane.distanceToPoint(wall.position) >= 0));
  const exterior = wall.position.clone().add(new THREE.Vector3(-1, 0, 0));
  assert.ok(planes.some((plane) => plane.distanceToPoint(exterior) < 0));
  wall.geometry.dispose(); (wall.material as THREE.Material).dispose();
});

test("各房间三维和俯视相机在横屏、竖屏中都能完整展示空间", () => {
  for (const aspect of [0.5, 1.8]) for (const plan of [false, true]) for (const room of rooms) {
    const halfHeight = Math.max(7.8, 9.2 / aspect);
    const camera = new THREE.OrthographicCamera(-halfHeight * aspect, halfHeight * aspect, halfHeight, -halfHeight, 0.1, 150);
    const pose = roomPose(room, camera, plan, 2.8);
    camera.position.copy(pose.position); camera.zoom = pose.zoom; camera.lookAt(pose.target);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    assert.ok(pose.zoom > 0 && pose.zoom <= 4);
    const b = roomDisplayBounds(room);
    for (const x of [b.west, b.east]) for (const z of [b.north, b.south]) for (const y of [0, 2.8]) {
      const projected = new THREE.Vector3(x - modelCenter[0], y, z - modelCenter[1]).project(camera);
      assert.ok(Math.abs(projected.x) < 0.9 && Math.abs(projected.y) < 0.9, `${room.id}: ${projected.toArray()}`);
    }
  }
});

test("卧室外凸飘窗保留在裁剪范围内，不会只剩下室内窗台", () => {
  for (const id of ["master", "parents", "study"]) {
    const room = rooms.find((item) => item.id === id)!;
    const display = roomDisplayBounds(room), floor = roomBounds(room);
    assert.ok(display.north < floor.north || display.south > floor.south);
    const clipping = roomClipping(room);
    const windowPoint = new THREE.Vector3((display.west + display.east) / 2 - modelCenter[0], 0.8,
      (id === "study" ? display.north : display.south) - modelCenter[1]);
    assert.ok(clipping.every((plane) => plane.distanceToPoint(windowPoint) >= 0));
  }
});

test("房间相机渐进聚焦，返回时恢复原观察位置，减少动画与手动中断均生效", () => {
  const camera = new THREE.OrthographicCamera(), target = new THREE.Vector3();
  const overview = { position: new THREE.Vector3(8, 19, 20), target: new THREE.Vector3(-2, 0, 1), zoom: 1.3 };
  const focused = roomPose(rooms[2], camera, false, 2.8);
  const motion = new RoomCameraMotion();
  motion.start(overview, focused, 0, false);
  assert.equal(motion.advance(240, camera, target), true);
  assert.ok(camera.position.distanceTo(focused.position) > 0);
  motion.advance(800, camera, target);
  assert.deepEqual(target.toArray(), focused.target.toArray());
  motion.start(focused, overview, 900, false);
  assert.equal(motion.advance(1700, camera, target), false);
  assert.ok(camera.position.distanceTo(overview.position) < 1e-10);
  assert.equal(camera.zoom, overview.zoom);
  assert.deepEqual(target.toArray(), overview.target.toArray());
  motion.start(overview, focused, 1800, true);
  assert.equal(motion.advance(1800, camera, target), false);
  assert.ok(camera.position.distanceTo(focused.position) < 1e-10);
  motion.start(focused, overview, 1900, false); motion.cancel();
  const before = camera.position.clone();
  assert.equal(motion.advance(2300, camera, target), false);
  assert.deepEqual(camera.position, before);
});

test("房间切换先拉远，再替换范围并聚焦；快速中断或减少动画不会留下旧房间", () => {
  const camera = new THREE.OrthographicCamera(), target = new THREE.Vector3();
  const from = { position: new THREE.Vector3(10, 19, 21), target: new THREE.Vector3(), zoom: 2 };
  const to = { position: new THREE.Vector3(12, 17, 20), target: new THREE.Vector3(2, 0.7, 3), zoom: 2.2 };
  const motion = new RoomCameraMotion();
  let scope = "old", commits = 0;
  const commit = () => { scope = "new"; commits++; };
  motion.start(from, to, 0, false, commit);
  motion.advance(150, camera, target);
  assert.equal(scope, "old", "拉远阶段应保留出发房间");
  assert.ok(camera.zoom < from.zoom && camera.zoom < to.zoom, "相邻房间同样大小也应有可见的取景变化");
  motion.advance(250, camera, target);
  assert.equal(scope, "new");
  motion.advance(500, camera, target); motion.cancel();
  assert.equal(commits, 1, "范围只能切换一次");
  motion.start(from, to, 1000, false, commit); motion.cancel();
  assert.equal(commits, 2, "手动操作打断过渡时立即完成范围切换");
  motion.start(from, to, 2000, true, commit);
  assert.equal(motion.advance(2000, camera, target), false);
  assert.equal(commits, 3);
  assert.equal(camera.zoom, to.zoom);
  assert.deepEqual(target, to.target);
});
