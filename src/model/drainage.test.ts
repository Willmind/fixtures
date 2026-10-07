import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { drainageZones, drainageElevation, floorDrainSize, floorElevation } from "./drainage.ts";
import { createDrainageFloor } from "./drainageGeometry.ts";
import { bathroomFittings } from "./arrangements.ts";
import { squatFloorHole } from "./squatToilet.ts";
import { modelCenter } from "./plan.ts";
import type { Point } from "./plan.ts";

test("干湿区独立汇水，淋浴区地漏保持左上角，新增地漏明确为候选", () => {
  assert.equal(drainageZones.length, 6);
  for (const id of ["bath", "ensuite"]) {
    const wet = drainageZones.find(({ id: zoneId }) => zoneId === `${id}-wet`)!;
    const dry = drainageZones.find(({ id: zoneId }) => zoneId === `${id}-dry`)!;
    assert.equal(wet.bounds.south, dry.bounds.north);
    assert.ok(wet.drain[0] < (wet.bounds.west + wet.bounds.east) / 2);
    assert.ok(wet.drain[1] < (wet.bounds.north + wet.bounds.south) / 2);
    assert.equal(wet.slope, 0.015);
    assert.equal(dry.slope, 0.01);
    assert.equal(dry.candidate, true);
  }
  assert.equal(drainageZones.find(({ id }) => id === "kitchen")!.candidate, true);
  assert.equal(drainageZones.find(({ id }) => id === "balcony")!.candidate, true);
});

test("各区坡面朝地漏持续下降，不高于门口基准，地漏格栅四边同高", () => {
  for (const zone of drainageZones) {
    const { west, east, north, south } = zone.bounds;
    const low = drainageElevation(zone, zone.drain);
    assert.ok(low > -0.08 && low < 0);
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      assert.ok(Math.abs(drainageElevation(zone,
        [zone.drain[0] + dx * floorDrainSize / 2, zone.drain[1] + dz * floorDrainSize / 2]) - low) < 1e-9);
    }
    for (let x = west; x <= east; x += 0.13) for (let z = north; z <= south; z += 0.13) {
      let previous = drainageElevation(zone, [x, z]);
      assert.ok(previous <= 1e-9 && previous >= low - 1e-9);
      for (let step = 1; step <= 10; step++) {
        const point: Point = [x + (zone.drain[0] - x) * step / 10, z + (zone.drain[1] - z) * step / 10];
        const y = drainageElevation(zone, point);
        assert.ok(y <= previous + 1e-9, `${zone.id}: 不能倒坡`);
        previous = y;
      }
    }
  }
  assert.equal(floorElevation("living", [4, 6]), 0);
});

test("真实坡面保留地漏及蹲厕孔洞，正面朝上且与坡度计算一致", () => {
  const fitting = bathroomFittings.find(({ roomId }) => roomId === "bath")!;
  const material = new THREE.MeshBasicMaterial();
  for (const zone of drainageZones) {
    const holes = zone.id === "bath-dry" ? [squatFloorHole(fitting.toilet.center, fitting.toilet.rotation)] : [];
    const geometry = createDrainageFloor(zone, holes);
    const mesh = new THREE.Mesh(geometry, material);
    const ray = new THREE.Raycaster();
    const hit = (point: Point) => {
      ray.set(new THREE.Vector3(point[0] - modelCenter[0], 1, point[1] - modelCenter[1]), new THREE.Vector3(0, -1, 0));
      return ray.intersectObject(mesh)[0];
    };
    assert.equal(hit(zone.drain), undefined, `${zone.id}: 地漏不能被瓷砖填住`);
    if (holes.length) assert.equal(hit(fitting.toilet.center), undefined, "蹲厕开口不能被坡面填住");
    const point: Point = [zone.bounds.east - 0.15, zone.bounds.south - 0.15];
    const actual = hit(point);
    assert.ok(actual, `${zone.id}: 应能从上面看见地面`);
    assert.ok(actual.face!.normal.y > 0);
    assert.ok(Math.abs(actual.point.y - drainageElevation(zone, point)) < 0.004);
    geometry.dispose();
  }
  material.dispose();
});
