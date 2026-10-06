import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createGasFlameMaterial, createGasFlames, GasBurner } from "./gasBurner.ts";
import { WaterTap } from "./waterTap.ts";
import { RobotRoute, robotCleaningRoute } from "./robotRoute.ts";
import { defaults, walls } from "./plan.ts";
import { diningFurniture, furnitureSize, livingLayouts, livingPlacement, televisionSideDecor, utilityEquipment } from "./arrangements.ts";

test("炉头独立开关，反向点击保持连续，点燃后持续动画、熄灭后停止", () => {
  const first = new GasBurner(new THREE.Group(), new THREE.Group());
  const second = new GasBurner(new THREE.Group(), new THREE.Group());
  assert.equal(first.flames.visible, false);
  first.toggle(0);
  first.advance(210);
  const height = first.flames.scale.y;
  first.toggle(210);
  assert.equal(first.flames.scale.y, height);
  assert.equal(first.advance(1000), false);
  assert.equal(first.flames.visible, false);
  first.toggle(1000);
  assert.equal(first.advance(1500), true);
  assert.equal(first.flames.visible, true);
  assert.equal(first.flames.scale.y, 1);
  assert.equal(first.knob.rotation.y, -Math.PI * 0.6);
  assert.equal(second.on, false);
  assert.equal(second.flames.visible, false);
});

test("火焰动画更新独立材质，减少动态效果时保持静态，关闭后不再重绘", () => {
  const outer = createGasFlameMaterial(), inner = createGasFlameMaterial(true);
  const flames = createGasFlames(outer, inner);
  const burner = new GasBurner(flames, new THREE.Group());
  const geometry = (flames.children[0] as THREE.Mesh).geometry;
  assert.ok(geometry.getAttribute("flameHeight"));
  assert.ok(geometry.getAttribute("jetPhase"));
  burner.toggle(0);
  assert.equal(burner.advance(1000), true);
  assert.equal(outer.uniforms.time.value, 1);
  assert.equal(inner.uniforms.time.value, 1);
  assert.equal(outer.uniforms.motion.value, 1);
  burner.toggle(1000);
  assert.equal(burner.advance(1500), false);
  burner.toggle(1500, true);
  assert.equal(burner.advance(2000), false);
  assert.equal(flames.visible, true);
  assert.equal(outer.uniforms.motion.value, 0);
  flames.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
  outer.dispose(); inner.dispose();
});

test("水流从出水口到盆底，关闭后隐藏，独立水龙头互不影响", () => {
  for (const [outlet, bottom] of [[0.9735, 0.744], [0.2125, -0.165]]) {
    const stream = new THREE.Mesh(), splash = new THREE.Mesh(), handle = new THREE.Group();
    const tap = new WaterTap(stream, splash, handle, outlet, bottom);
    assert.equal(stream.visible, false);
    assert.equal(splash.visible, false);
    const other = new WaterTap(new THREE.Mesh(), new THREE.Mesh(), new THREE.Group(), outlet, bottom);
    tap.toggle(0);
    assert.equal(other.on, false);
    assert.equal(tap.advance(500), false);
    assert.ok(Math.abs(stream.position.y + stream.scale.y / 2 - outlet) < 1e-9);
    assert.ok(Math.abs(stream.position.y - stream.scale.y / 2 - bottom) < 1e-9);
    assert.equal(splash.visible, true);
    assert.equal(handle.rotation.x, -0.3);
    tap.toggle(500, true);
    assert.equal(stream.visible, false);
    assert.equal(splash.visible, false);
    assert.ok(Math.abs(handle.rotation.x) < 1e-9);
  }
});

test("机器人暂停继续保持位置，完成后回充并可再次运行", () => {
  const route = new RobotRoute([[0, 0], [0, 1], [0, 0]], 1);
  route.toggle(0);
  route.advance(100);
  route.toggle(100);
  const paused = [...route.position];
  route.advance(10000);
  assert.deepEqual(route.position, paused);
  route.toggle(10000);
  assert.deepEqual(route.position, paused);
  for (let now = 10100; now <= 13000; now += 100) route.advance(now);
  assert.equal(route.status, "idle");
  assert.deepEqual(route.position, [0, 0]);
  assert.equal(route.heading, 0);
  route.toggle(14000);
  assert.equal(route.status, "running");
  assert.equal(route.advance(14100), true);
});

test("到达终点同时点击不进入暂停状态；后台恢复不会瞬间跨越路线", () => {
  const route = new RobotRoute([[0, 0], [0, 0.05]], 1);
  route.toggle(0);
  route.toggle(100);
  assert.equal(route.status, "idle");
  const longer = new RobotRoute([[0, 0], [0, 10]], 1);
  longer.toggle(0);
  longer.advance(100000);
  assert.ok(longer.position[1] <= 0.1);
});

test("固定清扫路线为两种客厅摆法保留机器人半径，避开墙、餐桌、茶几与边柜盆栽", () => {
  const radius = utilityEquipment.robot.radius;
  const distanceToBox = (x: number, z: number, cx: number, cz: number, halfX: number, halfZ: number) =>
    Math.hypot(Math.max(0, Math.abs(x - cx) - halfX), Math.max(0, Math.abs(z - cz) - halfZ));
  const decorWorld = (tv: ReturnType<typeof livingPlacement>["tv"], local: readonly [number, number]) => [
    tv.center[0] + Math.cos(tv.rotation) * local[0] + Math.sin(tv.rotation) * local[1],
    tv.center[1] - Math.sin(tv.rotation) * local[0] + Math.cos(tv.rotation) * local[1],
  ];
  assert.deepEqual(robotCleaningRoute[0], utilityEquipment.robot.center);
  assert.deepEqual(robotCleaningRoute.at(-1), utilityEquipment.robot.center);
  for (let i = 1; i < robotCleaningRoute.length; i++) {
    const a = robotCleaningRoute[i - 1], b = robotCleaningRoute[i];
    for (let n = 0; n <= 50; n++) {
      const x = a[0] + (b[0] - a[0]) * n / 50, z = a[1] + (b[1] - a[1]) * n / 50;
      for (const wall of walls) {
        const dx = wall.to[0] - wall.from[0], dz = wall.to[1] - wall.from[1];
        const fraction = Math.max(0, Math.min(1, ((x - wall.from[0]) * dx + (z - wall.from[1]) * dz) / (dx * dx + dz * dz)));
        assert.ok(Math.hypot(x - wall.from[0] - fraction * dx, z - wall.from[1] - fraction * dz)
          >= radius + (wall.thickness ?? defaults.wallThickness) / 2, wall.id);
      }
      const table = diningFurniture;
      assert.ok(distanceToBox(x, z, ...table.center, table.width / 2, 0.7) > radius);
      for (const layout of livingLayouts) {
        const { tv, sofa, coffeeTable } = livingPlacement(layout.id);
        for (const [object, size] of [[tv, furnitureSize.tvCabinet], [sofa, furnitureSize.sofa],
          [coffeeTable, furnitureSize.coffeeTable]] as const)
          assert.ok(distanceToBox(x, z, ...object.center, size.depth / 2, size.width / 2) > radius);
        const { cabinet, plant } = televisionSideDecor;
        const [cx, cz] = decorWorld(tv, cabinet.center), [px, pz] = decorWorld(tv, plant.center);
        assert.ok(distanceToBox(x, z, cx, cz, cabinet.depth / 2, cabinet.width / 2) > radius);
        assert.ok(Math.hypot(x - px, z - pz) > radius + plant.potRadius);
      }
    }
  }
});
