export type ThemePreference = "light" | "dark" | "system";
export type Theme = "light" | "dark";
export const themeStorageKey = "fixtures.theme.v1";
export const parseThemePreference = (value: string | null): ThemePreference =>
  value === "light" || value === "dark" ? value : "system";
export const resolveTheme = (preference: ThemePreference, systemDark: boolean): Theme =>
  preference === "system" ? (systemDark ? "dark" : "light") : preference;

type Environment = {
  read: () => string | null;
  write: (value: ThemePreference) => void;
  systemDark: () => boolean;
  subscribeSystem: (listener: () => void) => () => void;
  subscribeStorage: (listener: (value: string | null) => void) => () => void;
};

/** One shared subscription, so route changes don't reset appearance or WebGL. */
export function createThemeStore(environment: Environment) {
  let initial: string | null = null;
  try { initial = environment.read(); } catch { /* Private browsing can deny storage. */ }
  let preference = parseThemePreference(initial);
  let snapshot = { preference, resolved: resolveTheme(preference, environment.systemDark()) };
  const listeners = new Set<() => void>();
  let unsubscribe: (() => void) | undefined;
  const refresh = () => {
    const resolved = resolveTheme(preference, environment.systemDark());
    if (snapshot.preference === preference && snapshot.resolved === resolved) return;
    snapshot = { preference, resolved };
    listeners.forEach((listener) => listener());
  };
  return {
    getSnapshot: () => snapshot,
    setPreference(value: ThemePreference) {
      preference = value;
      try { environment.write(value); } catch { /* Still apply for this visit. */ }
      refresh();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!unsubscribe) {
        const stopSystem = environment.subscribeSystem(refresh);
        const stopStorage = environment.subscribeStorage((value) => {
          preference = parseThemePreference(value);
          refresh();
        });
        unsubscribe = () => { stopSystem(); stopStorage(); };
        refresh();
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) { unsubscribe?.(); unsubscribe = undefined; }
      };
    },
  };
}

let browserStore: ReturnType<typeof createThemeStore> | undefined;
export function getThemeStore() {
  if (!browserStore) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    browserStore = createThemeStore({
      read: () => localStorage.getItem(themeStorageKey),
      write: (value) => localStorage.setItem(themeStorageKey, value),
      systemDark: () => media.matches,
      subscribeSystem(listener) {
        media.addEventListener("change", listener);
        return () => media.removeEventListener("change", listener);
      },
      subscribeStorage(listener) {
        const handler = (event: StorageEvent) => {
          if (event.storageArea === localStorage && (event.key === themeStorageKey || event.key === null)) {
            listener(event.newValue);
          }
        };
        window.addEventListener("storage", handler);
        return () => window.removeEventListener("storage", handler);
      },
    });
  }
  return browserStore;
}
