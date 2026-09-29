import assert from "node:assert/strict";
import test from "node:test";
import {
  matchesPasscode,
  readAccessSession,
  saveAccessSession,
} from "./passcode.ts";

test("密码必须精确匹配，不接受错误密码、空值或额外空格", async () => {
  const fixtureDigest =
    "6743e89f029a39a1473a02d16640c73f028ab4d7f3512112875adb22242f06ff";
  assert.equal(await matchesPasscode("test-passcode", fixtureDigest), true);
  for (const value of ["", "wrong", "test-passcode ", " test-passcode"]) {
    assert.equal(await matchesPasscode(value, fixtureDigest), false);
  }
  assert.equal(await matchesPasscode("wrong"), false);
});

test("未登录和旧会话默认锁定，保存后可刷新，锁定会清除会话", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  assert.equal(readAccessSession(storage), false);
  values.set("fixtures.access.v1", "old-session");
  assert.equal(readAccessSession(storage), false);
  saveAccessSession(true, storage);
  assert.equal(readAccessSession(storage), true);
  saveAccessSession(false, storage);
  assert.equal(readAccessSession(storage), false);
  assert.equal(values.size, 0);
});

test("浏览器禁用存储时默认锁定且不会让页面崩溃", () => {
  const unavailable = () => {
    throw new Error("Storage unavailable");
  };
  const storage = {
    getItem: unavailable,
    setItem: unavailable,
    removeItem: unavailable,
  };
  assert.equal(readAccessSession(storage), false);
  assert.doesNotThrow(() => saveAccessSession(true, storage));
  assert.doesNotThrow(() => saveAccessSession(false, storage));
});
