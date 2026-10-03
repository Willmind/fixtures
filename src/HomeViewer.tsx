import { useEffect, useRef, useState } from "react";
import { ModelViewer } from "./ModelViewer";
import { AppIcon } from "./AppIcon";
import { Icon } from "./icons";
import { defaults, rooms } from "./model/plan";
import type { ViewOptions } from "./model/HomeScene";
import { photosForRoom } from "./visit/content";

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true" />
    </label>
  );
}

export default function HomeViewer({
  selected,
  onRoomChange: setSelected,
  onBack,
  onVisit,
  onOpenCad,
  onLock,
}: {
  selected: string | null;
  onRoomChange: (room: string | null) => void;
  onBack: () => void;
  onVisit: (room: string) => void;
  onOpenCad: () => void;
  onLock?: () => void;
}) {
  const [view, setView] = useState<ViewOptions["view"]>("perspective");
  const [cutaway, setCutaway] = useState(true);
  const [wallHeight, setWallHeight] = useState<number>(defaults.wallHeight);
  const [labels, setLabels] = useState(true);
  const [dimensions, setDimensions] = useState(false);
  const [grid, setGrid] = useState(true);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const room = rooms.find((item) => item.id === selected);
  const options = {
    selected,
    view,
    cutaway,
    wallHeight,
    labels,
    dimensions,
    grid,
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand" onClick={onBack} aria-label="返回户型资料">
          <AppIcon />
          <span>
            我的家<span className="brand-divider">/</span>
            <span className="brand-secondary">空间预览</span>
          </span>
        </button>
        <div className="header-right">
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
          <button className="text-button" onClick={onOpenCad}>
            <Icon name="layers" size={17} /> CAD 图纸
          </button>
          <span className="shell-badge">毛坯模型</span>
          <button
            className="text-button source-button"
            onClick={() => setShowSource(true)}
          >
            <Icon name="info" size={17} />
            模型说明
          </button>
          <button
            className="mobile-settings icon-button"
            aria-label="打开模型设置"
            onClick={() => setMobilePanel(true)}
          >
            <Icon name="sliders" />
          </button>
        </div>
      </header>
      <main className="workspace">
        {mobilePanel ? (
          <button
            className="panel-scrim"
            aria-label="关闭模型设置"
            onClick={() => setMobilePanel(false)}
          />
        ) : null}
        <aside
          className={`sidebar ${mobilePanel ? "is-open" : ""}`}
          aria-label="户型与模型设置"
        >
          <button
            className="mobile-panel-close icon-button"
            aria-label="关闭模型设置面板"
            onClick={() => setMobilePanel(false)}
          >
            <Icon name="close" />
          </button>
          <div className="project-heading">
            <span className="eyebrow">HOME / 001</span>
            <h1>D 户型</h1>
            <p>碧桂园世纪滨江 · 佛山</p>
            <div className="stats">
              <span>
                <b>4</b> 房
              </span>
              <span>
                <b>2</b> 卫
              </span>
              <span>
                <b>2</b> 阳台
              </span>
            </div>
          </div>
          <section className="room-section" aria-labelledby="room-title">
            <div className="section-title">
              <h2 id="room-title">空间</h2>
              <span>点击查看</span>
            </div>
            <div className="room-list">
              {rooms.map((item, index) => (
                <button
                  key={item.id}
                  className={`room-button ${selected === item.id ? "is-active" : ""}`}
                  aria-pressed={selected === item.id}
                  onClick={() => {
                    setSelected(selected === item.id ? null : item.id);
                    setMobilePanel(false);
                  }}
                >
                  <span className="room-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item.name}</span>
                  <Icon name="chevron" size={14} />
                </button>
              ))}
            </div>
          </section>
          <section className="settings-section" aria-labelledby="display-title">
            <div className="section-title">
              <h2 id="display-title">显示设置</h2>
              <Icon name="sliders" size={16} />
            </div>
            <Toggle
              label="半高墙 · 看清内部"
              checked={cutaway}
              onChange={setCutaway}
            />
            <Toggle label="房间名称" checked={labels} onChange={setLabels} />
            <Toggle
              label="图纸轴线尺寸"
              checked={dimensions}
              onChange={setDimensions}
            />
            <Toggle label="参考网格" checked={grid} onChange={setGrid} />
            <div className="height-control">
              <div>
                <label htmlFor="wall-height">墙体高度</label>
                <output htmlFor="wall-height">
                  {wallHeight.toFixed(2)} <span>m</span>
                </output>
              </div>
              <input
                id="wall-height"
                type="range"
                min="2.4"
                max="3.4"
                step="0.05"
                value={wallHeight}
                disabled={cutaway}
                onChange={(event) => setWallHeight(Number(event.target.value))}
              />
              <p>
                {cutaway
                  ? "当前截断至 1.05 m，关闭半高墙可调高度"
                  : "示意参数，尚未按现场实测校准"}
              </p>
            </div>
          </section>
          <div className="sidebar-footer">
            <Icon name="layers" size={17} />
            <span>
              图纸空间 + 现场外观参考<span>无家具 · 尺寸待现场复测</span>
            </span>
          </div>
        </aside>
        <section className="viewport" aria-label="交互式户型查看器">
          <div className="viewport-top">
            <div className="view-switch" role="group" aria-label="切换视角">
              <button
                aria-pressed={view === "perspective"}
                className={view === "perspective" ? "active" : ""}
                onClick={() => setView("perspective")}
              >
                <Icon name="cube" size={18} />
                三维视角
              </button>
              <button
                aria-pressed={view === "plan"}
                className={view === "plan" ? "active" : ""}
                onClick={() => setView("plan")}
              >
                <Icon name="plan" size={18} />
                俯视平面
              </button>
            </div>
            <span className="view-caption">
              D / {view === "plan" ? "俯视" : "鸟瞰"}
            </span>
          </div>
          <ModelViewer options={options} onSelect={setSelected} />
          <div className="orientation-marker" aria-hidden="true">
            <span className="axis-y">Y</span>
            <span className="axis-z">Z</span>
            <span className="axis-x">X</span>
            <i />
            <small>模型坐标</small>
          </div>
          {room ? (
            <div className="room-detail" aria-live="polite">
              <div className="room-detail-icon">
                <Icon name="room" size={23} />
              </div>
              <div>
                <span className="detail-eyebrow">已选择空间</span>
                <h2>{room.name}</h2>
                <p>{room.description}</p>
                <button
                  className="model-visit-link"
                  onClick={() => onVisit(room.id)}
                >
                  查看现场 · {photosForRoom(room.id).length} 张照片{" "}
                  <Icon name="chevron" size={14} />
                </button>
              </div>
              <button
                className="icon-button"
                aria-label="取消房间选择"
                onClick={() => setSelected(null)}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ) : (
            <div className="view-invitation">
              <span className="hint-line" />
              点击任意房间，了解空间布局
            </div>
          )}
          <div className="viewport-bottom">
            <span>
              <Icon name="mouse" size={15} />
              <span className="desktop-hint">
                {view === "plan" ? "拖动平移" : "拖动旋转"}
                <span className="hint-separator">·</span>滚轮缩放
                <span className="hint-separator">·</span>右键平移
              </span>
              <span className="touch-hint">
                {view === "plan" ? "单指平移" : "单指旋转"} · 双指缩放与平移
              </span>
            </span>
            <span>
              {cutaway ? "半高墙" : `完整墙高 ${wallHeight.toFixed(2)} m`}
              <span className="hint-separator">/</span>空间示意
            </span>
          </div>
        </section>
      </main>
      {showSource ? (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowSource(false);
          }}
        >
          <SourceDialog onClose={() => setShowSource(false)} />
        </div>
      ) : null}
    </div>
  );
}

function SourceDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      // React removes the dialog on close, so explicitly return keyboard focus.
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog
      className="source-dialog"
      ref={dialogRef}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="source-title"
    >
      <div
        className="dialog-content"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-heading">
          <h2 id="source-title">模型说明</h2>
          <button
            className="icon-button"
            aria-label="关闭模型说明"
            onClick={onClose}
            autoFocus
          >
            <Icon name="close" />
          </button>
        </div>
        <p>
          依据《住宅D户型.pdf》第 1 页墙体开线图、第 2
          页平面布置图，人工重建室内空间。原图日期为 2019 年 3 月。
        </p>
        <dl>
          <div>
            <dt>已参考</dt>
            <dd>
              图纸中的房间关系、主要墙体、门窗位置与轴线尺寸；实拍中的白色墙面、深色窗框和阳台玻璃栏板。
            </dd>
          </div>
          <div>
            <dt>仍是估值</dt>
            <dd>
              墙厚默认 0.20 m，墙高默认 2.80
              m；门窗高度、局部净尺寸、阳台栏杆与细部尚未实测。未还原局部飘窗和设备平台。
            </dd>
          </div>
          <div>
            <dt>建模范围</dt>
            <dd>
              毛坯室内及两个阳台，不含家具、电梯及公共管井。墙面颜色与栏杆形式参考实拍，材质分界和构件尺寸仍为示意。房间命名不代表最终用途。
            </dd>
          </div>
        </dl>
        <p className="source-note">
          这是可交互的空间示意模型。轴线尺寸不是室内净尺寸；模型不判断承重墙，也不能作为拆改或施工依据。
        </p>
        <form method="dialog" onSubmit={onClose}>
          <button className="primary-button">知道了</button>
        </form>
      </div>
    </dialog>
  );
}
