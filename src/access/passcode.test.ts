import assert from "node:assert/strict";
import test from "node:test";
import {
  matchesPasscode,
  readAccessSession,
  saveAccessSession,
  canAccessPage,
} from "./passcode.ts";
import { readRoute } from "../navigation.ts";

test("三维首页免密码，资料与电气图包括旧实拍和图纸直链均需解锁", () => {
  for (const search of ["", "?view=model", "?view=model&room=master"]) {
    const { view } = readRoute(search);
    assert.equal(canAccessPage(view, false), true, search);
  }
  for (const search of ["?view=cad", "?view=guide", "?tab=visit&room=master", "?tab=reading", "?tab=sources", "?tab=rooms"]) {
    const { view } = readRoute(search);
    assert.equal(canAccessPage(view, false), false, search);
    assert.equal(canAccessPage(view, true), true, search);
  }
  assert.equal(canAccessPage("model", false), true, "锁定资料后仍能浏览三维");
});

test("当前资料密码为 123456，旧密码和额外空格不能解锁", async () => {
  assert.equal(await matchesPasscode("123456"), true);
  for (const value of ["937899", "", "123456 ", " 123456"]) assert.equal(await matchesPasscode(value), false);
});

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
