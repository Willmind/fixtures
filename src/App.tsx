import { lazy, Suspense, useState } from "react";
import AccessGate from "./access/AccessGate";
import {
  passwordGateEnabled,
  readAccessSession,
  saveAccessSession,
} from "./access/passcode";

const HomeViewer = lazy(() => import("./HomeViewer"));
const CadWorkspace = lazy(() => import("./cad/CadWorkspace"));

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
  const [cad, setCad] = useState(
    () => new URLSearchParams(location.search).get("view") === "cad",
  );
  function changeView(value: boolean) {
    const url = new URL(location.href);
    if (value) url.searchParams.set("view", "cad");
    else {
      url.searchParams.delete("view");
      url.searchParams.delete("local");
    }
    history.replaceState(null, "", url);
    setCad(value);
  }
  return (
    <Suspense fallback={<div className="app-loading">正在打开我的家…</div>}>
      {cad ? (
        <CadWorkspace onBack={() => changeView(false)} onLock={onLock} />
      ) : (
        <HomeViewer onOpenCad={() => changeView(true)} onLock={onLock} />
      )}
    </Suspense>
  );
}
