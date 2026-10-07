import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { readRoute, routeUrl, type RouteState } from "./navigation";
import { ScrollPositionWriter } from "./ScrollPositionWriter";

type Destination = "top" | "content" | "plan" | "room" | "visit" | "notes";
type Position =
  | { top: number }
  | { anchor: Destination; mobileOnly?: boolean }
  | null;
type Options = {
  replace?: boolean;
  anchor?: Destination;
  mobileOnly?: boolean;
};
const scrollKey = "fixturesScroll";
const guideKey = (route: RouteState) =>
  `${route.tab}:${route.room ?? "living"}`;
const savedTop = () => {
  const value: unknown = history.state?.[scrollKey];
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
};

export function useWorkspaceNavigation() {
  const [navigation, setNavigation] = useState(() => ({
    route: readRoute(location.search),
    position: { top: savedTop() } as Position,
    revision: 0,
  }));
  const guidePositions = useRef(new Map<string, number>());
  const routeRef = useRef(navigation.route);
  const scrollWriter = useRef<ScrollPositionWriter | null>(null);
  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    const writer = new ScrollPositionWriter((top) => {
      history.replaceState({ ...history.state, [scrollKey]: top }, "");
    }, {
      schedule: (callback, delay) => window.setTimeout(callback, delay),
      cancel: (id) => window.clearTimeout(id),
    });
    scrollWriter.current = writer;
    const scroll = () => {
      const top = window.scrollY;
      if (routeRef.current.view === "guide")
        guidePositions.current.set(guideKey(routeRef.current), top);
      writer.record(top);
    };
    const flush = () => writer.flush();
    const hidden = () => { if (document.visibilityState === "hidden") writer.flush(); };
    const pop = () => {
      writer.cancel();
      const route = readRoute(location.search);
      routeRef.current = route;
      setNavigation((previous) => ({
        route,
        position: { top: savedTop() },
        revision: previous.revision + 1,
      }));
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("popstate", pop);
    window.addEventListener("scrollend", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      writer.flush();
      writer.cancel();
      if (scrollWriter.current === writer) scrollWriter.current = null;
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("popstate", pop);
      window.removeEventListener("scrollend", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", hidden);
      history.scrollRestoration = previous;
    };
  }, []);

  function navigate(
    update: Partial<RouteState>,
    options: Options = {},
    restore?: number,
  ) {
    const current = routeRef.current;
    scrollWriter.current?.cancel();
    if (current.view === "guide")
      guidePositions.current.set(guideKey(current), window.scrollY);
    history.replaceState({ ...history.state, [scrollKey]: window.scrollY }, "");
    const route = { ...current, ...update };
    history[options.replace ? "replaceState" : "pushState"](
      { [scrollKey]: restore ?? (options.anchor ? 0 : window.scrollY) },
      "",
      routeUrl(location.href, route),
    );
    routeRef.current = route;
    setNavigation((previous) => ({
      route,
      position:
        restore !== undefined
          ? { top: restore }
          : options.anchor
            ? { anchor: options.anchor, mobileOnly: options.mobileOnly }
            : null,
      revision: previous.revision + 1,
    }));
  }
  function returnToGuide() {
    const top = guidePositions.current.get(guideKey(routeRef.current));
    navigate({ view: "guide" }, { anchor: "content" }, top);
  }
  return { ...navigation, navigate, returnToGuide };
}

// Inside Suspense: positioning runs only after the destination's DOM is committed.
export function PagePosition({
  position,
  revision,
}: {
  position: Position;
  revision: number;
}) {
  useLayoutEffect(() => {
    if (!position) return;
    if ("top" in position) {
      window.scrollTo({ top: position.top, behavior: "instant" });
      return;
    }
    if (position.mobileOnly && !window.matchMedia("(max-width: 760px)").matches)
      return;
    if (position.anchor === "top") {
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    const ids = {
      content: "guide-browse",
      plan: "room-plan",
      room: "room-detail",
      visit: "visit-room",
      notes: "room-notebook",
    };
    const target = document.getElementById(ids[position.anchor]);
    target?.scrollIntoView({ block: "start", behavior: "instant" });
    if (position.anchor !== "content") target?.focus({ preventScroll: true });
  }, [position, revision]);
  return null;
}
