export type IconName =
  | "home"
  | "cube"
  | "plan"
  | "layers"
  | "plus"
  | "minus"
  | "reset"
  | "info"
  | "chevron"
  | "room"
  | "sliders"
  | "close"
  | "lock"
  | "mouse"
  | "sun"
  | "moon"
  | "monitor"
  | "check"
  | "bulb"
  | "bulb-off";
const paths: Record<IconName, React.ReactNode> = {
  monitor: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M12 17v4m-4 0h8" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
  moon: <path d="M20.5 13.1A8.6 8.6 0 0 1 10.9 3.5a8.6 8.6 0 1 0 9.6 9.6Z" />,
  bulb: <><path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z" /><path d="M12 3V1M4 5 3 4m17 1 1-1" /></>,
  "bulb-off": <><path d="m3 3 18 18M9 18h6m-5 3h4M7 7a6 6 0 0 0 1 7c1 1 1 2 1 2h6M10 4a6 6 0 0 1 7 9" /></>,
  home: (
    <>
      <path d="m3 10 9-7 9 7M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
      <path d="M9 21v-7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7" />
    </>
  ),
  cube: (
    <>
      <path d="m12 3 9 5v9l-9 5-9-5V8Z" />
      <path d="m3 8 9 5 9-5M12 13v9M7.5 5.5l9 5" />
    </>
  ),
  plan: (
    <>
      <path d="M3 3h18v18H3Z" />
      <path d="M3 10h8V3M11 10v5m0 3v3M15 10h6" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 10 5-10 5L2 8ZM2 12l10 5 10-5M2 16l10 5 10-5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  reset: (
    <>
      <path d="M3 4v6h6M3.5 10a9 9 0 1 1 .5 6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7v.1" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  room: (
    <>
      <path d="M4 21V3h16v18M2 21h20M8 21V7h8v14" />
      <path d="M13 14h.1" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h7m4 0h5M4 18h3m4 0h9" />
      <circle cx="13" cy="6" r="2" />
      <circle cx="9" cy="18" r="2" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </>
  ),
  mouse: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="6" />
      <path d="M12 2v7" />
    </>
  ),
};
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
