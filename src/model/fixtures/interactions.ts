import type * as THREE from "three";
import type { HomeFixtures } from "../HomeFixtures.ts";

type ToggleHost = Pick<HomeFixtures, "toggleRobot" | "toggleBedsideLamp" | "toggleCeilingLight"
  | "toggleExhaustFan" | "toggleWaterTap" | "toggleGasBurner" | "toggleDoor"
  | "toggleBedDrawer" | "toggleCurtain">;
type AnimationHost = Pick<HomeFixtures, "animateCurtains" | "animateDoors" | "animateBedDrawers"
  | "animateGasBurners" | "animateAppliances">;
type Action = {
  matches: (object: THREE.Object3D) => boolean;
  toggle: (host: ToggleHost, object: THREE.Object3D, now: number, reducedMotion: boolean) => boolean;
};
const tagged = (...keys: string[]) => (object: THREE.Object3D) => keys.some((key) => typeof object.userData[key] === "number");

// One registry defines both the pointer affordance and dispatch priority.
const actions: readonly Action[] = [
  { matches: (object) => object.userData.robotVacuum === true, toggle: (host, object, now) => host.toggleRobot(object, now) },
  { matches: tagged("bedsideLampIndex"), toggle: (host, object) => host.toggleBedsideLamp(object) },
  { matches: tagged("ceilingLightIndex"), toggle: (host, object) => host.toggleCeilingLight(object) },
  { matches: tagged("exhaustFanIndex"), toggle: (host, object, now, reduce) => host.toggleExhaustFan(object, now, reduce) },
  { matches: tagged("waterTapIndex"), toggle: (host, object, now, reduce) => host.toggleWaterTap(object, now, reduce) },
  { matches: tagged("gasBurnerIndex"), toggle: (host, object, now, reduce) => host.toggleGasBurner(object, now, reduce) },
  { matches: tagged("homeDoorIndex", "glazingDoorIndex"), toggle: (host, object, now, reduce) => host.toggleDoor(object, now, reduce) },
  { matches: (object) => tagged("bedDrawerIndex")(object) || Array.isArray(object.userData.bedDrawerIds), toggle: (host, object, now, reduce) => host.toggleBedDrawer(object, now, reduce) },
  { matches: tagged("curtainIndex"), toggle: (host, object, now, reduce) => host.toggleCurtain(object, now, reduce) },
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
