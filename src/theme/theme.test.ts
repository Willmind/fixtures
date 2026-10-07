import test from "node:test";
import assert from "node:assert/strict";
import { createThemeStore } from "./theme.ts";
import type { ThemePreference } from "./theme.ts";

function fixture(saved: string | null = null, dark = false, denied = false) {
  const systemListeners = new Set<() => void>();
  const storageListeners = new Set<(value: string | null) => void>();
  const store = createThemeStore({
    read() { if (denied) throw new Error("blocked"); return saved; },
    write(value: ThemePreference) { if (denied) throw new Error("blocked"); saved = value; },
    systemDark: () => dark,
    subscribeSystem(listener) { systemListeners.add(listener); return () => { systemListeners.delete(listener); }; },
    subscribeStorage(listener) { storageListeners.add(listener); return () => { storageListeners.delete(listener); }; },
  });
  return { store, get saved() { return saved; }, systemListeners, storageListeners,
    changeSystem(value: boolean) { dark = value; systemListeners.forEach((listener) => listener()); },
    changeStorage(value: string | null) { saved = value; storageListeners.forEach((listener) => listener(value)); },
  };
}

test("默认跟随系统，系统外观变化自动生效；手动浅色或深色不被系统覆盖", () => {
  const f = fixture();
  const unsubscribe = f.store.subscribe(() => {});
  assert.deepEqual(f.store.getSnapshot(), { preference: "system", resolved: "light" });
  f.changeSystem(true);
  assert.equal(f.store.getSnapshot().resolved, "dark");
  f.store.setPreference("light");
  f.changeSystem(false); f.changeSystem(true);
  assert.equal(f.store.getSnapshot().resolved, "light");
  assert.equal(f.saved, "light");
  f.store.setPreference("dark");
  f.changeSystem(false);
  assert.equal(f.store.getSnapshot().resolved, "dark");
  f.store.setPreference("system");
  assert.equal(f.store.getSnapshot().resolved, "light");
  unsubscribe();
});

test("恢复保存的选择，其他标签页修改或清除偏好也会同步", () => {
  const f = fixture("dark");
  const unsubscribe = f.store.subscribe(() => {});
  assert.equal(f.store.getSnapshot().resolved, "dark");
  f.changeStorage("light");
  assert.equal(f.store.getSnapshot().resolved, "light");
  f.changeStorage(null);
  assert.equal(f.store.getSnapshot().preference, "system");
  f.changeSystem(true);
  assert.equal(f.store.getSnapshot().resolved, "dark");
  unsubscribe();
});

test("只保留一份系统订阅，全部卸载后清理；无变化时复用状态对象", () => {
  const f = fixture("light");
  const offA = f.store.subscribe(() => {}), offB = f.store.subscribe(() => {});
  assert.equal(f.systemListeners.size, 1);
  assert.equal(f.storageListeners.size, 1);
  const snapshot = f.store.getSnapshot();
  f.changeSystem(true);
  assert.equal(f.store.getSnapshot(), snapshot);
  offA();
  assert.equal(f.systemListeners.size, 1);
  offB();
  assert.equal(f.systemListeners.size, 0);
  assert.equal(f.storageListeners.size, 0);
  const offC = f.store.subscribe(() => {});
  assert.equal(f.systemListeners.size, 1);
  offC();
});

test("存储异常不妨碍切换，非法旧偏好恢复为跟随系统", () => {
  assert.equal(fixture("invalid", true).store.getSnapshot().resolved, "dark");
  const f = fixture(null, false, true);
  const off = f.store.subscribe(() => {});
  f.store.setPreference("dark");
  assert.equal(f.store.getSnapshot().resolved, "dark");
  off();
});
