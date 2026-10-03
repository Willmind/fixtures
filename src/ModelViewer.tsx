import { useEffect, useRef, useState } from "react";
import { HomeScene } from "./model/HomeScene";
import type { ViewOptions } from "./model/HomeScene";
import { Icon } from "./icons";

type Props = { options: ViewOptions; onSelect: (id: string | null) => void };

export function ModelViewer({ options, onSelect }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<HomeScene | null>(null);
  const initialOptions = useRef(options);
  const selectionCallback = useRef(onSelect);
  const [error, setError] = useState<string | null>(null);

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
      {error ? (
        <div className="viewer-error" role="alert">
          <Icon name="info" />
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>重新载入</button>
        </div>
      ) : null}
      <div className="camera-tools" aria-label="视角控制">
        <button
          title="放大"
          aria-label="放大模型"
          onClick={() => scene.current?.zoom(1.2)}
        >
          <Icon name="plus" />
        </button>
        <button
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
      </div>
    </>
  );
}
