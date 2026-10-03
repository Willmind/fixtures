import { rooms } from "./model/plan.ts";
export const guideTabs = ["rooms", "visit", "reading", "sources"] as const;
export type GuideTab = (typeof guideTabs)[number];
export type RouteState = {
  view: "guide" | "model" | "cad";
  tab: GuideTab;
  room: string | null;
};

export function readRoute(search: string): RouteState {
  const query = new URLSearchParams(search);
  const view = query.get("view");
  const tab = query.get("tab");
  const room = query.get("room");
  return {
    view: view === "cad" || view === "model" ? view : "guide",
    tab: guideTabs.includes(tab as GuideTab) ? (tab as GuideTab) : "rooms",
    room: rooms.some((item) => item.id === room) ? room : null,
  };
}
export function routeUrl(href: string, route: RouteState): URL {
  const url = new URL(href);
  for (const [key, value] of Object.entries(route)) {
    if (
      value === null ||
      (key === "view" && value === "guide") ||
      (key === "tab" && value === "rooms")
    )
      url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  url.searchParams.delete("local");
  return url;
}
