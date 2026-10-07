import { createContext, useContext, useLayoutEffect, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { getThemeStore } from "./theme";
import type { Theme, ThemePreference } from "./theme";

const ThemeContext = createContext<{
  preference: ThemePreference; resolved: Theme; setPreference: (value: ThemePreference) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const store = getThemeStore();
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useLayoutEffect(() => {
    if (document.documentElement.dataset.theme !== snapshot.resolved) {
      document.documentElement.dataset.theme = snapshot.resolved;
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content",
      snapshot.resolved === "dark" ? "#111113" : "#f5f5f7");
  }, [snapshot.resolved]);
  const value = useMemo(() => ({ ...snapshot, setPreference: store.setPreference }), [snapshot, store]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("网页主题需要 ThemeProvider");
  return theme;
}
