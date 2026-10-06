import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { ExhaustFan } from "./exhaustFans.ts";

const makeFan = () => new ExhaustFan(new THREE.Group(), new THREE.MeshBasicMaterial());

test("排气扇默认停止，独立启动旋转，关机减速后停止重绘", () => {
  const first = makeFan(), second = makeFan();
  assert.equal(first.on, false);
  assert.equal(first.advance(0), false);
  first.toggle(0);
  assert.equal(first.advance(210), true);
  const early = first.rotor.rotation.z;
  assert.ok(early > 0);
  assert.equal(first.advance(500), true);
  assert.ok(first.rotor.rotation.z > early);
  assert.equal(second.on, false);
  assert.equal(second.rotor.rotation.z, 0);
  first.toggle(500);
  assert.equal(first.advance(650), true);
  assert.equal(first.advance(1000), false);
  const stopped = first.rotor.rotation.z;
  assert.equal(first.advance(2000), false);
  assert.equal(first.rotor.rotation.z, stopped);
});

test("快速反向点击可继续旋转，后台恢复不跳转多圈", () => {
  const fan = makeFan();
  fan.toggle(0);
  fan.advance(500);
  fan.toggle(500);
  fan.advance(600);
  fan.toggle(600);
  assert.equal(fan.on, true);
  fan.advance(1000);
  const before = fan.rotor.rotation.z;
  assert.equal(fan.advance(100000), true);
  const change = (fan.rotor.rotation.z - before + Math.PI * 2) % (Math.PI * 2);
  assert.ok(change <= 0.08 * Math.PI * 3 + 1e-9);
});

test("减少动态效果时通过指示灯显示开关，不持续旋转", () => {
  const indicator = new THREE.MeshBasicMaterial();
  const fan = new ExhaustFan(new THREE.Group(), indicator);
  const off = indicator.color.getHex();
  fan.toggle(0, true);
  assert.equal(fan.on, true);
  assert.notEqual(indicator.color.getHex(), off);
  assert.equal(fan.advance(1000), false);
  assert.equal(fan.rotor.rotation.z, 0);
  fan.toggle(1000, true);
  assert.equal(fan.on, false);
  assert.equal(indicator.color.getHex(), off);
  indicator.dispose();
});
