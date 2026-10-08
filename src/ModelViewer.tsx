import { useEffect, useRef, useState } from "react";
import { HomeScene } from "./model/HomeScene";
import type { ViewOptions } from "./model/options";
import { Icon } from "./icons";

type Props = {
  options: ViewOptions;
  onSelect: (id: string | null) => void;
  onLightsChange: (on: boolean) => void;
  onHintsChange: (on: boolean) => void;
};

export function ModelViewer({ options, onSelect, onLightsChange, onHintsChange }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<HomeScene | null>(null);
  const initialOptions = useRef(options);
  const selectionCallback = useRef(onSelect);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; revision: number } | null>(null);
  const [hintSeen, setHintSeen] = useState(() => {
    try { return localStorage.getItem("fixtures.interaction-intro.v1") === "seen"; }
    catch { return false; }
  });
  function dismissHint() {
    setHintSeen(true);
    try { localStorage.setItem("fixtures.interaction-intro.v1", "seen"); } catch { /* Optional preference. */ }
  }
  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [feedback]);
  useEffect(() => { setFeedback(null); }, [options.focusedRoom]);

  useEffect(() => {
    selectionCallback.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!host.current) return;
    try {
      scene.current = new HomeScene(
        host.current,
        initialOptions.current,
        (id) => selectionCallback.current(id),
        setError,
        (text) => {
          setFeedback((previous) => ({ text, revision: (previous?.revision ?? 0) + 1 }));
          setHintSeen(true);
          try { localStorage.setItem("fixtures.interaction-intro.v1", "seen"); } catch { /* Optional preference. */ }
        },
      );
    } catch (cause) {
      console.error("三维模型初始化失败", cause);
      setError(
        "无法启动 3D 视图。请使用支持 WebGL 2 的浏览器，并开启硬件加速。",
      );
    }
    return () => {
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  useEffect(() => {
    scene.current?.update(options);
  }, [options]);

  return (
    <>
      <div className="model-canvas" ref={host} />
      <div className={`fixture-feedback${feedback ? " is-visible" : ""}`} role="status" aria-live="polite" aria-atomic="true">
        {feedback?.text}
      </div>
      {options.focusedRoom && options.interactionHints !== false && !hintSeen && !feedback ? (
        <div className="fixture-intro">
          <span>带圆点的物品可以点击操作</span>
          <button type="button" aria-label="知道了，关闭交互说明" onClick={dismissHint}><Icon name="close" size={14} /></button>
        </div>
      ) : null}
      {error ? (
        <div className="viewer-error" role="alert">
          <Icon name="info" />
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>重新载入</button>
        </div>
      ) : null}
      <div className="camera-tools" aria-label="视角与灯光控制">
        <button className="camera-zoom-action"
          title="放大"
          aria-label="放大模型"
          onClick={() => scene.current?.zoom(1.2)}
        >
          <Icon name="plus" />
        </button>
        <button className="camera-zoom-action"
          title="缩小"
          aria-label="缩小模型"
          onClick={() => scene.current?.zoom(1 / 1.2)}
        >
          <Icon name="minus" />
        </button>
        <span />
        <button
          title="恢复视角"
          aria-label="恢复视角"
          onClick={() => scene.current?.resetView()}
        >
          <Icon name="reset" />
        </button>
        <span />
        <button className="hint-action" title="显示或隐藏当前房间的交互提示"
          aria-label="房间交互提示" aria-pressed={options.interactionHints !== false}
          onClick={() => onHintsChange(options.interactionHints === false)}>
          <Icon name="info" size={18} /><small>提示</small>
        </button>
        <button className="light-action" title="打开所有顶灯和床头灯"
          aria-label="全部开灯" disabled={options.layout === "empty"}
          onClick={() => onLightsChange(true)}>
          <Icon name="bulb" size={18} />
          <small>开灯</small>
        </button>
        <button className="light-action" title="关闭所有顶灯和床头灯"
          aria-label="全部关灯" disabled={options.layout === "empty"}
          onClick={() => onLightsChange(false)}>
          <Icon name="bulb-off" size={18} />
          <small>关灯</small>
        </button>
      </div>
    </>
  );
}
