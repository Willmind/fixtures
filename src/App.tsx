import { lazy, Suspense, useEffect, useState } from "react";
import AccessGate from "./access/AccessGate";
import { AppIcon } from "./AppIcon";
import { PageErrorBoundary } from "./PageErrorBoundary";
import { readRoute, routeUrl, type RouteState } from "./navigation";
import {
  passwordGateEnabled,
  readAccessSession,
  saveAccessSession,
} from "./access/passcode";

const HomeViewer = lazy(() => import("./HomeViewer"));
const CadWorkspace = lazy(() => import("./cad/CadWorkspace"));
const HomeGuide = lazy(() => import("./guide/HomeGuide"));

export default function App() {
  return passwordGateEnabled ? <ProtectedWorkspace /> : <Workspace />;
}

function ProtectedWorkspace() {
  const [allowed, setAllowed] = useState(readAccessSession);
  function unlock() {
    saveAccessSession(true);
    setAllowed(true);
  }
  function lock() {
    saveAccessSession(false);
    setAllowed(false);
  }
  return allowed ? (
    <Workspace onLock={lock} />
  ) : (
    <AccessGate onUnlock={unlock} />
  );
}

function Workspace({ onLock }: { onLock?: () => void }) {
  const [route, setRoute] = useState(() => readRoute(location.search));
  const { view } = route;
  useEffect(() => {
    const update = () => setRoute(readRoute(location.search));
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  function navigate(update: Partial<RouteState>, replace = false) {
    const next = { ...route, ...update };
    history[replace ? "replaceState" : "pushState"](
      null,
      "",
      routeUrl(location.href, next),
    );
    setRoute(next);
  }
  return (
    <PageErrorBoundary key={view}>
      <Suspense fallback={<AppLoading />}>
        {view === "cad" ? (
          <CadWorkspace
            onBack={() => navigate({ view: "guide" })}
            onLock={onLock}
          />
        ) : view === "model" ? (
          <HomeViewer
            selected={route.room}
            onOpenCad={() => navigate({ view: "cad" })}
            onBack={() => navigate({ view: "guide" })}
            onVisit={(room) => navigate({ view: "guide", tab: "visit", room })}
            onRoomChange={(room) => navigate({ room }, true)}
            onLock={onLock}
          />
        ) : (
          <HomeGuide
            tab={route.tab}
            selected={route.room ?? "living"}
            onTabChange={(tab) => navigate({ tab })}
            onRoomChange={(room) => navigate({ room }, true)}
            onModel={() =>
              navigate({ view: "model", room: route.room ?? "living" })
            }
            onCad={() => navigate({ view: "cad" })}
            onLock={onLock}
          />
        )}
      </Suspense>
    </PageErrorBoundary>
  );
}

function AppLoading() {
  return (
    <main className="app-loading">
      <div className="app-loading-content">
        <AppIcon className="app-loading-icon" />
        <div className="app-loading-status" role="status" aria-atomic="true">
          <span className="app-loading-spinner" aria-hidden="true" />
          <span>正在打开我的家…</span>
        </div>
      </div>
    </main>
  );
}
