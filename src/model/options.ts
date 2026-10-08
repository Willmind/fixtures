import type { BalconyModes, CurtainColor, LayoutPreview } from "./arrangements";
import type { TelevisionMount } from "./furniture";

export type LightingMode = "day" | "night";
export type LightState = { on: boolean; mixed: boolean };

export type FixtureOptions = {
  lightingMode: LightingMode;
  lightCommand?: { on: boolean; revision: number };
  lightsVisible?: boolean;
  layout: LayoutPreview;
  curtainColor: CurtainColor;
  televisionMount: TelevisionMount;
  balconyRoofs: boolean;
  balconyModes: BalconyModes;
  equipment: boolean;
  cutaway: boolean;
  view: "perspective" | "plan";
  wallHeight: number;
  labels: boolean;
};

export type ViewOptions = FixtureOptions & {
  dimensions: boolean;
  grid: boolean;
  selected: string | null;
  drainage: boolean;
  focusedRoom?: string | null;
  interactionHints?: boolean;
};

const fixtureKeys = ["lightingMode", "layout", "curtainColor", "televisionMount", "balconyRoofs", "equipment", "cutaway", "view", "wallHeight", "labels"] as const;

export function fixtureAppearanceChanged(previous: FixtureOptions, next: FixtureOptions): boolean {
  return fixtureKeys.some((key) => key !== "labels" && previous[key] !== next[key])
    || previous.balconyModes.balcony !== next.balconyModes.balcony
    || previous.balconyModes.utility !== next.balconyModes.utility
    || (previous.lightsVisible ?? true) !== (next.lightsVisible ?? true)
    || previous.lightCommand?.revision !== next.lightCommand?.revision
    || previous.lightCommand?.on !== next.lightCommand?.on;
}

/** Compare values, not React object identity. UI-only settings never touch furniture. */
export function fixtureOptionsChanged(previous: FixtureOptions, next: FixtureOptions): boolean {
  return fixtureAppearanceChanged(previous, next) || previous.labels !== next.labels;
}

export function viewOptionsChanged(previous: ViewOptions, next: ViewOptions): boolean {
  return fixtureOptionsChanged(previous, next)
    || previous.selected !== next.selected || previous.dimensions !== next.dimensions
    || previous.grid !== next.grid || previous.drainage !== next.drainage
    || (previous.interactionHints ?? true) !== (next.interactionHints ?? true)
    || (previous.focusedRoom ?? null) !== (next.focusedRoom ?? null);
}
