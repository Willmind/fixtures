import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";

/** Desktop inspector stays non-modal; the mobile sheet owns focus while open. */
export function ModelControlPanel({ title, anchor, closeRequested, children, onClose }: {
  title: string; anchor: RefObject<HTMLDivElement | null>; closeRequested: boolean; children: ReactNode; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) onClose();
    else setClosing(true);
  }, [onClose]);
  useEffect(() => { if (closeRequested) requestClose(); }, [closeRequested, requestClose]);
  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(onClose, 250);
    return () => window.clearTimeout(timer);
  }, [closing, onClose]);
  useLayoutEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const opener = document.activeElement;
    const mobile = window.matchMedia("(max-width: 760px)");
    let modal = mobile.matches;
    const position = () => {
      const bounds = anchor.current?.getBoundingClientRect();
      if (bounds) {
        const top = Math.min(bounds.bottom + 12, Math.max(16, window.innerHeight - 240));
        node.style.setProperty("--control-panel-top", `${top}px`);
        // Align with the floating cards, leaving room for the zoom rail.
        const width = Math.min(370, window.innerWidth - 32);
        const left = Math.max(16, Math.min(bounds.left, window.innerWidth - 96 - width));
        node.style.setProperty("--control-panel-left", `${left}px`);
      }
    };
    const show = () => {
      position();
      if (mobile.matches) node.showModal(); else node.show();
      node.querySelector<HTMLElement>("[data-dialog-title]")?.focus({ preventScroll: true });
    };
    const resize = () => {
      position();
      if (modal !== mobile.matches) { modal = mobile.matches; node.close(); show(); }
    };
    const outside = (event: PointerEvent) => {
      if (!mobile.matches && event.target instanceof Node && !node.contains(event.target)
        && !anchor.current?.contains(event.target)) requestClose();
    };
    const escape = (event: KeyboardEvent) => {
      if (!mobile.matches && event.key === "Escape") { event.preventDefault(); requestClose(); }
    };
    show();
    const observer = new ResizeObserver(position);
    if (anchor.current) observer.observe(anchor.current);
    window.addEventListener("resize", resize);
    mobile.addEventListener("change", resize);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      observer.disconnect(); node.close();
      window.removeEventListener("resize", resize);
      mobile.removeEventListener("change", resize);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [anchor, requestClose]);
  return createPortal(<dialog ref={dialog} className={`model-control-panel${closing ? " is-closing" : ""}`}
    aria-labelledby="model-control-panel-title"
    onCancel={(event) => { event.preventDefault(); requestClose(); }}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right
        || event.clientY < bounds.top || event.clientY > bounds.bottom) requestClose();
    }}>
    <div className="model-control-panel-content" inert={closing}>
      <div className="dialog-heading">
        <div className="model-control-panel-title">
          <span className="model-control-panel-icon" aria-hidden="true"><Icon name={title === "显示设置" ? "layers" : "sliders"} size={19} /></span>
          <h2 id="model-control-panel-title" tabIndex={-1} data-dialog-title="">{title}</h2>
        </div>
        <button type="button" className="icon-button" aria-label={`关闭${title}`} onClick={requestClose}>
          <Icon name="close" size={18} />
        </button>
      </div>
      <div className="model-control-panel-scroll">{children}</div>
    </div>
  </dialog>, document.body);
}
