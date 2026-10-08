import type * as THREE from "three";
import type { HomeFixtures } from "../HomeFixtures.ts";

type ToggleHost = Pick<HomeFixtures, "toggleRobot" | "toggleBedsideLamp" | "toggleCeilingLight"
  | "toggleExhaustFan" | "toggleWaterTap" | "toggleGasBurner" | "toggleDoor"
  | "toggleBedDrawer" | "toggleCurtain" | "toggleDryingRack">;
type AnimationHost = Pick<HomeFixtures, "animateCurtains" | "animateDoors" | "animateBedDrawers"
  | "animateGasBurners" | "animateAppliances">;
type Action = {
  kind: string;
  title: string;
  matches: (object: THREE.Object3D) => boolean;
  toggle: (host: ToggleHost, object: THREE.Object3D, now: number, reducedMotion: boolean) => boolean;
};
const tagged = (...keys: string[]) => (object: THREE.Object3D) => keys.some((key) => typeof object.userData[key] === "number");

// One registry defines both the pointer affordance and dispatch priority.
const actions: readonly Action[] = [
  { kind: "dryingRack", title: "晾衣架", matches: (object) => object.userData.dryingRack === true, toggle: (host, object, now, reduce) => host.toggleDryingRack(object, now, reduce) },
  { kind: "robotVacuum", title: "扫地机器人", matches: (object) => object.userData.robotVacuum === true, toggle: (host, object, now) => host.toggleRobot(object, now) },
  { kind: "bedsideLampIndex", title: "床头灯", matches: tagged("bedsideLampIndex"), toggle: (host, object) => host.toggleBedsideLamp(object) },
  { kind: "ceilingLightIndex", title: "顶灯", matches: tagged("ceilingLightIndex"), toggle: (host, object) => host.toggleCeilingLight(object) },
  { kind: "exhaustFanIndex", title: "排气扇", matches: tagged("exhaustFanIndex"), toggle: (host, object, now, reduce) => host.toggleExhaustFan(object, now, reduce) },
  { kind: "waterTapIndex", title: "水龙头", matches: tagged("waterTapIndex"), toggle: (host, object, now, reduce) => host.toggleWaterTap(object, now, reduce) },
  { kind: "gasBurnerIndex", title: "燃气灶", matches: tagged("gasBurnerIndex"), toggle: (host, object, now, reduce) => host.toggleGasBurner(object, now, reduce) },
  { kind: "homeDoorIndex", title: "门", matches: tagged("homeDoorIndex", "glazingDoorIndex"), toggle: (host, object, now, reduce) => host.toggleDoor(object, now, reduce) },
  { kind: "bedDrawerIndex", title: "床底抽屉", matches: (object) => tagged("bedDrawerIndex")(object) || Array.isArray(object.userData.bedDrawerIds), toggle: (host, object, now, reduce) => host.toggleBedDrawer(object, now, reduce) },
  { kind: "curtainIndex", title: "窗帘", matches: tagged("curtainIndex"), toggle: (host, object, now, reduce) => host.toggleCurtain(object, now, reduce) },
];

export function isFixtureOperable(object: THREE.Object3D) {
  return actions.some((action) => action.matches(object));
}

export function toggleFixture(host: ToggleHost, object: THREE.Object3D, now: number, reducedMotion: boolean) {
  return actions.some((action) => action.matches(object) && action.toggle(host, object, now, reducedMotion));
}

export function animateFixtures(host: AnimationHost, now: number) {
  // Never short-circuit: each active animation must advance in the same frame.
  const results = [host.animateCurtains(now), host.animateDoors(now), host.animateBedDrawers(now),
    host.animateGasBurners(now), host.animateAppliances(now)];
  return results.some(Boolean);
}

/** The same registry identifies hints, pointer affordances and toggle dispatch. */
export function fixtureInteractionTarget(object: THREE.Object3D) {
  const action = actions.find((item) => item.matches(object));
  if (!action) return;
  let key = action.kind;
  if (action.kind === "homeDoorIndex" && typeof object.userData.glazingDoorIndex === "number") {
    key = `glazingDoorIndex:${object.userData.glazingDoorIndex}`;
  } else if (typeof object.userData[action.kind] === "number") {
    key += `:${object.userData[action.kind]}`;
  } else if (Array.isArray(object.userData.bedDrawerIds)) {
    key += `:${object.userData.bedDrawerIds.join(",")}`;
  }
  let title = action.title;
  if (action.kind === "homeDoorIndex") {
    for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) {
      const name = parent.name;
      if (name.includes("wardrobe")) { title = "衣柜门"; break; }
      if (name.includes("shoe-cabinet")) { title = "鞋柜门"; break; }
      if (name.includes("display-cabinet")) { title = "展示柜门"; break; }
      if (name.includes("fridge")) { title = "冰箱门"; break; }
      if (name.includes("washer")) { title = "洗衣机门"; break; }
      if (name.includes("wet-area")) { title = "淋浴门"; break; }
      if (name.includes("operable-windows")) { title = "窗户"; break; }
      if (name.includes("main-balcony")) { title = "阳台玻璃门"; break; }
    }
  }
  return { key, kind: action.kind, title };
}
