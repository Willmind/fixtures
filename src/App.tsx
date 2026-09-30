import { lazy, Suspense, useEffect, useState } from "react";
import AccessGate from "./access/AccessGate";
import { AppIcon } from "./AppIcon";
import { PageErrorBoundary } from "./PageErrorBoundary";
import {
  passwordGateEnabled,
  readAccessSession,
  saveAccessSession,
} from "./access/passcode";

const HomeViewer = lazy(() => import("./HomeViewer"));
const CadWorkspace = lazy(() => import("./cad/CadWorkspace"));
const HomeGuide = lazy(() => import("./guide/HomeGuide"));
type View = "guide" | "model" | "cad";
function currentView(): View {
  const view = new URLSearchParams(location.search).get("view");
  return view === "cad" || view === "model" ? view : "guide";
}

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
  const [view, setView] = useState<View>(currentView);
  useEffect(() => {
    const update = () => setView(currentView());
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  function changeView(value: View) {
    const url = new URL(location.href);
    if (value !== "guide") url.searchParams.set("view", value);
    else url.searchParams.delete("view");
    url.searchParams.delete("local");
    history.pushState(null, "", url);
    setView(value);
  }
  return (
    <PageErrorBoundary key={view}>
      <Suspense fallback={<AppLoading />}>
        {view === "cad" ? (
          <CadWorkspace onBack={() => changeView("guide")} onLock={onLock} />
        ) : view === "model" ? (
          <HomeViewer onOpenCad={() => changeView("cad")} onLock={onLock} />
        ) : (
          <HomeGuide
            onModel={() => changeView("model")}
            onCad={() => changeView("cad")}
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
