import { useCallback, useEffect, useRef, useState } from "react";
import { Color, Vector3 } from "three";
import { DxfViewer } from "dxf-viewer";
import type { LayerInfo } from "dxf-viewer";
import { AppIcon } from "../AppIcon";
import { Icon } from "../icons";
import {
  decodeDxf,
  filterLayerNames,
  prepareDxfLayers,
  validateCadFile,
} from "./document";
import type { CadReport } from "./document";
import { fetchHomeDrawing } from "./homeDrawing";
import "./cad.css";

type Layer = LayerInfo & { visible: boolean; empty: boolean };
type LocalResult = { dxf: string; report: CadReport };
const local = import.meta.env.DEV;
const homeBounds = { minX: 113100, maxX: 172700, minY: -304250, maxY: -262100 };
const homeViews = [
  {
    id: "lighting",
    title: "灯与开关",
    minX: 116000,
    maxX: 136000,
    minY: -280100,
    maxY: -263000,
    description:
      "左上图：照明设备和线路。先找房间，再看灯、开关之间的联系；它是原设计，不是现场线路探测结果。",
  },
  {
    id: "sockets",
    title: "插座与用电",
    minX: 136000,
    maxX: 156500,
    minY: -280100,
    maxY: -263000,
    description:
      "右上图：普通插座、专用用电设备与回路。先列家电清单，再让设计人员逐项核对是否需要调整。",
  },
  {
    id: "network",
    title: "网络与电视",
    minX: 116000,
    maxX: 136000,
    minY: -298200,
    maxY: -281000,
    description:
      "左下图：通信、电视及相关弱电布置。你要做书房，可以重点讨论电脑有线网络、路由器和弱电箱的位置。",
  },
  {
    id: "positions",
    title: "综合点位",
    minX: 136000,
    maxX: 156500,
    minY: -298200,
    maxY: -281000,
    description:
      "右下图：设备点位集中在同一户型上，方便对照房间。位置和数量尚未逐个核实，不作为施工点位清单。",
  },
] as const;

export default function CadWorkspace({
  onBack,
  onLock,
}: {
  onBack: () => void;
  onLock?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<DxfViewer | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  const source = useRef<{ text: string; name: string } | null>(null);
  const preferredBounds = useRef<typeof homeBounds | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [error, setError] = useState("");
  const [report, setReport] = useState<CadReport | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dark, setDark] = useState(false);
  const darkRef = useRef(dark);
  const [panel, setPanel] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [homeDrawing, setHomeDrawing] = useState(false);
  const [homeView, setHomeView] = useState("all");

  const load = useCallback(
    async (
      read: () => Promise<{
        bytes: ArrayBuffer;
        name: string;
        report?: CadReport;
        bounds?: typeof homeBounds;
      }>,
    ) => {
      const id = ++generation.current;
      request.current?.abort();
      request.current = new AbortController();
      setBusy(true);
      setError("");
      setWarnings([]);
      setPhase("正在读取图纸…");
      try {
        const file = await read();
        const text = decodeDxf(file.bytes);
        if (id !== generation.current || !host.current) return;
        preferredBounds.current = file.bounds ?? null;
        engine.current?.Destroy();
        host.current.replaceChildren();
        delete host.current.dataset.loaded;
        source.current = null;
        setLoaded(false);
        setLayers([]);
        setReport(file.report ?? null);
        setName(file.name);
        setHomeDrawing(Boolean(file.bounds));
        setHomeView("all");
        const viewer = new DxfViewer(host.current, {
          autoResize: true,
          antialias: true,
          clearColor: new Color(darkRef.current ? "#172229" : "#fafbf9"),
          retainParsedDxf: true,
          colorCorrection: true,
          fileEncoding: "utf-8",
        });
        engine.current = viewer;
        viewer.Subscribe(
          "message",
          (event: CustomEvent<{ level: string; message: string }>) => {
            const detail = event.detail;
            if (id !== generation.current || detail.level === "info") return;
            const message = detail.message.includes("missing fonts")
              ? "部分字体字符无法显示，当前使用替代字体。"
              : detail.message;
            setWarnings((previous) =>
              previous.includes(message) ? previous : [...previous, message],
            );
          },
        );
        const prepared = prepareDxfLayers(text);
        const url = URL.createObjectURL(
          new Blob([prepared.text], { type: "application/dxf" }),
        );
        try {
          await viewer.Load({
            url,
            fonts: [
              new URL(
                file.bounds
                  ? "fonts/fixtures-home-cad.ttf"
                  : "fonts/fixtures-cad-sans.ttf",
                document.baseURI,
              ).href,
            ],
            workerFactory: () =>
              new Worker(new URL("./worker.ts", import.meta.url), {
                type: "module",
              }),
            progressCbk: (phase) => {
              if (id === generation.current)
                setPhase(
                  {
                    fetch: "正在读取图形…",
                    parse: "正在解析图层…",
                    font: "正在准备中文标注…",
                    prepare: "正在生成图纸…",
                  }[phase],
                );
            },
          });
        } finally {
          URL.revokeObjectURL(url);
        }
        if (id !== generation.current) return;
        const nonEmpty = new Set(
          [...viewer.GetLayers(true)].map((item) => item.name),
        );
        const parsedLayers = viewer.GetDxf()?.tables?.layer?.layers ?? {};
        const next = [...viewer.GetLayers()].map((item) => ({
          ...item,
          visible:
            parsedLayers[item.name]?.visible !== false &&
            !prepared.frozen.has(item.name),
          empty: !nonEmpty.has(item.name),
        }));
        for (const layer of next)
          if (!layer.visible) viewer.ShowLayer(layer.name, false);
        setLayers(next);
        setQuery("");
        setLoaded(true);
        source.current = {
          text,
          name: file.name.replace(/\.(dwg|dxf)$/i, "") + ".dxf",
        };
        host.current.dataset.loaded = "true";
        host.current.dataset.layers = String(next.length);
        if (file.bounds) {
          const origin = viewer.GetOrigin();
          viewer.FitView(
            file.bounds.minX - origin.x,
            file.bounds.maxX - origin.x,
            file.bounds.minY - origin.y,
            file.bounds.maxY - origin.y,
          );
          viewer.Render();
        }
      } catch (cause) {
        if (id !== generation.current) return;
        setError(
          cause instanceof Error ? cause.message : "图纸读取失败，请重试。",
        );
      } finally {
        if (id === generation.current) {
          setBusy(false);
          setPhase("");
        }
      }
    },
    [],
  );

  const readLocalResult = useCallback(
    async (response: Response, overrideName?: string) => {
      if (!response.ok) throw new Error(await response.text());
      const result = (await response.json()) as LocalResult;
      const bytes = Uint8Array.from(atob(result.dxf), (char) =>
        char.charCodeAt(0),
      );
      if (overrideName) result.report.name = overrideName;
      return {
        bytes: bytes.buffer,
        name: result.report.name,
        report: result.report,
      };
    },
    [],
  );

  const openReference = useCallback(
    () =>
      load(async () =>
        readLocalResult(
          await fetch("/__cad/reference", { signal: request.current?.signal }),
        ),
      ),
    [load, readLocalResult],
  );

  const openHome = useCallback(
    () =>
      load(async () => {
        setPhase("正在下载电气图…");
        return {
          bytes: await fetchHomeDrawing(request.current?.signal),
          name: "D 户型电气平面图 · ZD11 · 2019.03",
          bounds: homeBounds,
        };
      }),
    [load],
  );

  useEffect(() => {
    if (local && new URLSearchParams(location.search).get("local") === "1")
      void openReference();
    else void openHome();
    return () => {
      generation.current++;
      request.current?.abort();
      engine.current?.Destroy();
      engine.current = null;
    };
  }, [openReference, openHome]);

  function openFile(file?: File) {
    if (!file || busy) return;
    try {
      validateCadFile(file.name, file.size);
    } catch (cause) {
      setError((cause as Error).message);
      return;
    }
    if (/\.dwg$/i.test(file.name) && !local) {
      setError(
        "DWG 转换目前在本机开发版运行。请在本地选择 DWG，下载转换结果后，在这里导入 DXF。",
      );
      return;
    }
    void load(async () => {
      if (/\.dwg$/i.test(file.name)) {
        setPhase("正在本机转换 DWG，可能需要十几秒…");
        return readLocalResult(
          await fetch("/__cad/convert", {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: file,
            signal: request.current?.signal,
          }),
          file.name,
        );
      }
      return { bytes: await file.arrayBuffer(), name: file.name };
    });
  }

  function setVisibility(predicate: (layer: Layer) => boolean) {
    const next = layers.map((layer) => {
      const visible = predicate(layer);
      if (visible !== layer.visible)
        engine.current?.ShowLayer(layer.name, visible);
      return { ...layer, visible };
    });
    setLayers(next);
  }

  function fit() {
    const viewer = engine.current,
      bounds = preferredBounds.current ?? viewer?.GetBounds();
    if (!viewer || !bounds) return;
    const origin = viewer.GetOrigin();
    viewer.FitView(
      bounds.minX - origin.x,
      bounds.maxX - origin.x,
      bounds.minY - origin.y,
      bounds.maxY - origin.y,
    );
    viewer.Render();
    setHomeView("all");
  }
  function focusHome(view: (typeof homeViews)[number]) {
    const viewer = engine.current;
    if (!viewer) return;
    const origin = viewer.GetOrigin();
    viewer.FitView(
      view.minX - origin.x,
      view.maxX - origin.x,
      view.minY - origin.y,
      view.maxY - origin.y,
    );
    viewer.Render();
    setHomeView(view.id);
    setPanel(false);
  }
  function zoom(factor: number) {
    const viewer = engine.current;
    if (!viewer) return;
    const camera = viewer.GetCamera();
    viewer.SetView(
      new Vector3(camera.position.x, camera.position.y, 0),
      (camera.right - camera.left) / camera.zoom / factor,
    );
    viewer.Render();
  }
  function download() {
    if (!source.current) return;
    // ASCII Unicode escapes keep the original DXF codepage declaration valid.
    const text = source.current.text.replace(
      /[^\x00-\x7F]/g,
      (char) =>
        "\\U+" + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0"),
    );
    const url = URL.createObjectURL(
      new Blob([text], { type: "application/dxf" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = source.current.name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const shownNames = new Set(
    filterLayerNames(
      layers.map((layer) => layer.name),
      query,
    ),
  );
  const visible = layers.filter(
    (layer) => !layer.empty && layer.visible,
  ).length;

  return (
    <div className="app-shell cad-app">
      <header className="app-header">
        <button className="brand cad-brand" onClick={onBack}>
          <AppIcon />
          <span>
            我的家<span className="brand-divider">/</span>
            <span className="brand-secondary">CAD 图纸</span>
          </span>
        </button>
        <div className="cad-header-actions">
          {onLock ? (
            <button
              className="icon-button access-lock"
              onClick={onLock}
              aria-label="锁定访问"
              title="锁定访问"
            >
              <Icon name="lock" size={17} />
            </button>
          ) : null}
          <button className="text-button" onClick={onBack}>
            <Icon name="home" size={17} />
            返回资料
          </button>
          <span className="shell-badge">设计图 · 待现场核对</span>
          <button
            className="text-button cad-open"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            导入其他图纸
          </button>
        </div>
        <input
          ref={input}
          className="cad-file-input"
          aria-label="选择 CAD 文件"
          type="file"
          accept=".dwg,.dxf"
          onChange={(event) => {
            openFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </header>
      <main
        className="cad-workspace"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          openFile(event.dataTransfer.files[0]);
        }}
      >
        {panel ? (
          <button
            className="cad-panel-scrim"
            aria-label="关闭图层面板"
            onClick={() => setPanel(false)}
          />
        ) : null}
        <aside
          className={`cad-sidebar ${panel ? "is-open" : ""}`}
          aria-label="CAD 图层面板"
        >
          <div className="cad-file-heading">
            <span className="eyebrow">DRAWING / CAD</span>
            <h1>我家的电气图</h1>
            <p title={name}>{name || "正在加载图纸"}</p>
            <button
              className="cad-reference"
              disabled={busy}
              onClick={() => void openHome()}
            >
              重新加载我家图纸
            </button>
            {loaded ? (
              <div className="cad-stats">
                <span>
                  <b>{layers.filter((layer) => !layer.empty).length}</b>{" "}
                  有内容图层
                </span>
                <span>
                  <b>{visible}</b> 显示
                </span>
              </div>
            ) : null}
          </div>
          {homeDrawing ? (
            <section className="cad-home-guide" aria-label="按生活问题看电气图">
              <h2>你想了解什么？</h2>
              <div>
                {homeViews.map((view) => (
                  <button
                    key={view.id}
                    disabled={!loaded || busy}
                    aria-pressed={homeView === view.id}
                    onClick={() => focusHome(view)}
                  >
                    {view.title}
                  </button>
                ))}
              </div>
              <p>
                {homeViews.find((view) => view.id === homeView)?.description ??
                  "这四幅小图是同一个 D 户型：分别表达照明、插座、弱电和综合点位。点上面的按钮可直接放大对应区域。"}
              </p>
            </section>
          ) : null}
          <div className="cad-layer-heading">
            <h2>图层</h2>
            <button
              className="cad-mobile-close icon-button"
              aria-label="收起图层面板"
              onClick={() => setPanel(false)}
            >
              <Icon name="close" />
            </button>
          </div>
          <label className="cad-search">
            <span className="cad-sr-only">搜索图层</span>
            <input
              type="search"
              placeholder="搜索墙、门窗、插座…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              disabled={!loaded}
            />
          </label>
          <div className="cad-layer-actions">
            <button
              disabled={!loaded}
              onClick={() => setVisibility(() => true)}
            >
              全部显示
            </button>
            <button
              disabled={!loaded}
              onClick={() => setVisibility(() => false)}
            >
              全部隐藏
            </button>
          </div>
          <div className="cad-layer-list">
            {layers
              .filter((layer) => shownNames.has(layer.name) && !layer.empty)
              .map((layer) => (
                <div
                  className={`cad-layer-row ${layer.visible ? "is-visible" : ""}`}
                  key={layer.name}
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={layer.visible}
                      onChange={() =>
                        setVisibility((item) =>
                          item.name === layer.name
                            ? !item.visible
                            : item.visible,
                        )
                      }
                      aria-label={`显示图层 ${layer.displayName}`}
                    />
                    <span
                      className="cad-layer-color"
                      style={{
                        background:
                          "#" + layer.color.toString(16).padStart(6, "0"),
                      }}
                    />
                    <span className="cad-layer-name" title={layer.displayName}>
                      {layer.displayName}
                    </span>
                    {layer.empty ? <small>空</small> : null}
                  </label>
                  <button
                    className="cad-isolate"
                    aria-label={`仅显示 ${layer.displayName}`}
                    title="仅显示此图层"
                    onClick={() =>
                      setVisibility((item) => item.name === layer.name)
                    }
                  >
                    仅看
                  </button>
                </div>
              ))}
            {loaded &&
            !layers.some(
              (layer) => !layer.empty && shownNames.has(layer.name),
            ) ? (
              <p className="cad-muted">没有匹配的图层</p>
            ) : null}
            {!loaded ? (
              <p className="cad-muted">
                打开图纸后，可在这里独立控制每个图层。
              </p>
            ) : null}
          </div>
          <div className="cad-sidebar-footer">
            <Icon name="layers" size={17} />
            <span>
              图层来自 CAD 文件
              <br />
              显示状态仅影响当前视图
            </span>
          </div>
        </aside>
        <section
          className={`cad-viewport ${dark ? "is-dark" : ""}`}
          aria-label="CAD 图纸查看器"
        >
          <div className="cad-canvas" ref={host} />
          <div className="cad-toolbar">
            <button
              className="cad-mobile-layers"
              onClick={() => setPanel(true)}
            >
              <Icon name="layers" size={16} />
              图层
            </button>
            <span>二维原图</span>
            <button disabled={!loaded} onClick={fit}>
              <Icon name="reset" size={16} />
              显示全图
            </button>
            <button
              onClick={() => {
                const next = !dark;
                setDark(next);
                darkRef.current = next;
                engine.current?.SetClearColor(next ? "#172229" : "#fafbf9");
              }}
            >
              {dark ? "浅色背景" : "深色背景"}
            </button>
            {loaded ? <button onClick={download}>下载 DXF</button> : null}
          </div>
          {!loaded && !busy ? (
            <div className="cad-empty">
              <span className="cad-empty-icon">
                <Icon name="plan" size={38} />
              </span>
              <span className="eyebrow">YOUR ORIGINAL DRAWING</span>
              <h2>我家的 D 户型电气图</h2>
              <p>
                图纸已经随网站保存。加载失败时可以重试，也可以另行打开文件。
              </p>
              <button
                className="primary-button"
                onClick={() => void openHome()}
              >
                重新加载我家图纸
              </button>
              <button
                className="primary-button"
                onClick={() => input.current?.click()}
              >
                选择 {local ? "DWG / DXF" : "DXF"} 文件
              </button>
              {local ? (
                <button
                  className="cad-reference"
                  onClick={() => void openReference()}
                >
                  打开本机已解析的图纸
                </button>
              ) : null}
              <small>
                {local
                  ? "DWG 在本机转换 · DXF 在浏览器读取"
                  : "DXF 在当前浏览器读取，不上传文件"}
                <br />
                也可以将图纸拖到这里
              </small>
            </div>
          ) : null}
          {busy ? (
            <div className="cad-loading-overlay" role="status">
              <span className="cad-spinner" />
              <strong>{phase}</strong>
              <span>保留图层与原始绘图坐标</span>
            </div>
          ) : null}
          {error ? (
            <div className="cad-error" role="alert">
              <Icon name="info" size={18} />
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="关闭错误提示"
                onClick={() => setError("")}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ) : null}
          {loaded ? (
            <>
              <div className="camera-tools cad-camera-tools">
                <button aria-label="放大图纸" onClick={() => zoom(1.5)}>
                  <Icon name="plus" />
                </button>
                <button aria-label="缩小图纸" onClick={() => zoom(1 / 1.5)}>
                  <Icon name="minus" />
                </button>
                <button aria-label="适合窗口" onClick={fit}>
                  <Icon name="reset" />
                </button>
              </div>
              <div className="cad-status">
                <span>拖动平移 · 滚轮 / 双指缩放</span>
                <span>模型空间 · 图纸单位需核对</span>
              </div>
            </>
          ) : null}
          {loaded ? (
            <details className="cad-compatibility">
              <summary>显示兼容性说明</summary>
              <p>
                {report?.unsupportedCount
                  ? `转换器报告 ${report.unsupportedCount} 个未识别对象；部分内容可能缺失。`
                  : homeDrawing
                    ? "本页默认显示从 DWG 提取的 ZD11 图纸，原文件转换有 711 个未识别对象，不能保证全部符号完整。"
                    : "当前使用通用字体显示标注。"}{" "}
                线型、字体与部分标注样式可能与 CAD 原软件不同，请结合原图核对。
              </p>
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </details>
          ) : null}
        </section>
      </main>
    </div>
  );
}
