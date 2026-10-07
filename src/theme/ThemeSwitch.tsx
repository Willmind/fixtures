import { useId, useRef } from "react";
import { Icon } from "../icons";
import { useTheme } from "./ThemeProvider";
import type { ThemePreference } from "./theme";

const choices = [
  { value: "light", label: "浅色", icon: "sun" },
  { value: "dark", label: "深色", icon: "moon" },
  { value: "system", label: "跟随系统", icon: "monitor" },
] as const;

export function ThemeSwitch() {
  const { preference, setPreference } = useTheme();
  const id = useId();
  const menu = useRef<HTMLDivElement>(null);
  const current = choices.find(({ value }) => value === preference)!;
  const select = (value: ThemePreference) => {
    setPreference(value);
    menu.current?.hidePopover();
  };
  return (
    <div className="theme-switch">
      <button type="button" className="theme-trigger" popoverTarget={id}
        aria-label={`网页外观：${current.label}`} title={`网页外观：${current.label}`}
        onClick={(event) => {
          if (!menu.current) return;
          const rect = event.currentTarget.getBoundingClientRect();
          menu.current.style.left = `${Math.max(12, Math.min(window.innerWidth - 212, rect.right - 200))}px`;
          menu.current.style.top = `${rect.bottom + 10}px`;
          menu.current.style.right = "auto";
        }}>
        <Icon name={current.icon} size={18} />
        <span>外观</span>
      </button>
      <div ref={menu} id={id} popover="auto" className="theme-menu" role="group" aria-label="网页外观">
        <p>网页外观</p>
        {choices.map(({ value, label, icon }) => (
          <button key={value} type="button" aria-pressed={preference === value} onClick={() => select(value)}>
            <Icon name={icon} size={18} />
            <span>{label}</span>
            {preference === value ? <Icon name="check" size={16} /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
