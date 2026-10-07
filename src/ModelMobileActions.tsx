import { useId, useRef } from "react";
import { Icon } from "./icons";

type Props = {
  onCad: () => void;
  onSource: () => void;
  onSettings: () => void;
};

/** Native popover handles outside dismissal, Escape and returning focus. */
export function ModelMobileActions({ onCad, onSource, onSettings }: Props) {
  const id = useId();
  const menu = useRef<HTMLDivElement>(null);
  const activate = (action: () => void) => {
    menu.current?.hidePopover();
    action();
  };
  return (
    <div className="model-mobile-actions">
      <button type="button" className="icon-button" popoverTarget={id}
        aria-label="更多模型操作" title="更多操作">
        <Icon name="more" size={21} />
      </button>
      <div ref={menu} id={id} popover="auto" className="model-actions-menu"
        role="group" aria-label="模型操作">
        <button type="button" onClick={() => activate(onSettings)}><Icon name="sliders" size={18} />模型设置</button>
        <button type="button" onClick={() => activate(onCad)}><Icon name="layers" size={18} />CAD 图纸</button>
        <button type="button" onClick={() => activate(onSource)}><Icon name="info" size={18} />模型说明</button>
      </div>
    </div>
  );
}
