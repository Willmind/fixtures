import { lazy, Suspense, useState } from "react";
import AccessGate from "./access/AccessGate";
import { AppIcon } from "./AppIcon";
import { PageErrorBoundary } from "./PageErrorBoundary";
import { PagePosition, useWorkspaceNavigation } from "./useWorkspaceNavigation";
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
  const { route, position, revision, navigate, returnToGuide } = useWorkspaceNavigation();
  const [photoIndices, setPhotoIndices] = useState<Record<string, number>>({});
  const { view } = route;
  return (
    <PageErrorBoundary key={view}>
      <Suspense fallback={<AppLoading />}>
        {view === "cad" ? (
          <CadWorkspace
            onBack={returnToGuide}
            onLock={onLock}
          />
        ) : view === "model" ? (
          <HomeViewer
            selected={route.room}
            onOpenCad={() => navigate({ view: "cad" }, { anchor: "top" })}
            onBack={returnToGuide}
            onVisit={(room) => navigate({ view: "guide", tab: "visit", room }, { anchor: "visit" })}
            onRoomChange={(room) => navigate({ room }, { replace: true })}
            onLock={onLock}
          />
        ) : (
          <HomeGuide
            tab={route.tab}
            selected={route.room ?? "living"}
            onTabChange={(tab) => navigate({ tab }, { anchor: "content" })}
            onPlan={() => navigate({ tab: "rooms" }, { anchor: "plan" })}
            onVisit={() => navigate({ tab: "visit" }, { anchor: "visit" })}
            onRoomChange={(room) => navigate({ room }, { replace: true, anchor: route.tab === "visit" ? "visit" : "room", mobileOnly: true })}
            photoIndices={photoIndices}
            onPhotoChange={(room, index) => setPhotoIndices((previous) => ({ ...previous, [room]: index }))}
            onModel={() =>
              navigate({ view: "model", room: route.room ?? "living" }, { anchor: "top" })
            }
            onCad={() => navigate({ view: "cad" }, { anchor: "top" })}
            onLock={onLock}
          />
        )}
        <PagePosition position={position} revision={revision} />
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
