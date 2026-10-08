import { openDialogAtTitle } from "./dialogs/openDialog";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ModelViewer } from "./ModelViewer";
import { AppIcon } from "./AppIcon";
import { Icon } from "./icons";
import { ThemeSwitch } from "./theme/ThemeSwitch";
import { defaults, rooms } from "./model/plan";
import type { ViewOptions, LightState } from "./model/options";
import { ModelRoomDetails } from "./ModelRoomDetails";
import { ModelMobileActions } from "./ModelMobileActions";
import { ModelRoomPicker } from "./ModelRoomPicker";
import { ModelControlPanel } from "./ModelControlPanel";
import { balconyChoices, balconyModeLabels, curtainColors, livingLayouts } from "./model/arrangements";
import type { BalconyModes, CurtainColor, LayoutPreview } from "./model/arrangements";
import { televisionMounts } from "./model/furniture";
import type { TelevisionMount } from "./model/furniture";

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const descriptionId = useId();
  return (
    <label className="toggle-row">
      <span className="setting-toggle-label"><span>{label}</span>
        {description ? <small id={descriptionId}>{description}</small> : null}
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        aria-describedby={description ? descriptionId : undefined}
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
  const [lightingMode, setLightingMode] = useState<ViewOptions["lightingMode"]>("day");
  const [lightCommand, setLightCommand] = useState<ViewOptions["lightCommand"]>();
  const [cutaway, setCutaway] = useState(true);
  const [wallHeight, setWallHeight] = useState<number>(defaults.wallHeight);
  const [labels, setLabels] = useState(false);
  const [interactionHints, setInteractionHints] = useState(true);
  const [roomView, setRoomView] = useState(false);
  const [roomDetailsOpen, setRoomDetailsOpen] = useState(false);
  // Use the controlled selection so browser navigation cannot leave a stale room on screen.
  const focusedRoom = roomView ? selected : null;
  const [dimensions, setDimensions] = useState(true);
  const [grid, setGrid] = useState(true);
  const [drainage, setDrainage] = useState(false);
  const [layout, setLayout] = useState<LayoutPreview>("tv-guest");
  const [curtainColor, setCurtainColor] = useState<CurtainColor>(curtainColors[0].id);
  const [televisionMount, setTelevisionMount] = useState<TelevisionMount>("cabinet");
  const [balconyRoofs, setBalconyRoofs] = useState(true);
  const [balconyModes, setBalconyModes] = useState<BalconyModes>({ balcony: "original", utility: "enclosed" });
  const [previewTab, setPreviewTab] = useState<"living" | "balconies" | "curtains">("living");
  const [controlPanel, setControlPanel] = useState<{ kind: "scheme" | "display"; closing: boolean } | null>(null);
  function toggleControlPanel(kind: "scheme" | "display") {
    setControlPanel((current) => current?.kind === kind ? { kind, closing: true } : { kind, closing: false });
  }
  const toolbar = useRef<HTMLDivElement>(null);
  const closeControlPanel = useCallback(() => setControlPanel(null), []);
  const [lightState, setLightState] = useState<LightState>({ on: false, mixed: false });
  const handleLightState = useCallback((state: LightState) => {
    setLightState((previous) => previous.on === state.on && previous.mixed === state.mixed ? previous : state);
  }, []);
  const commandLights = (on: boolean) => setLightCommand((previous) => ({ on, revision: (previous?.revision ?? 0) + 1 }));
  const [equipment, setEquipment] = useState(true);
  const [showSource, setShowSource] = useState(false);
  const room = rooms.find((item) => item.id === (focusedRoom ?? selected));
  const currentLayout = livingLayouts.find((item) => item.id === layout);
  const selectedBalcony = balconyChoices.find((item) => item.id === room?.id);
  function chooseRoom(id: string | null) {
    setRoomView(id !== null);
    setSelected(id);
    setControlPanel(null);
  }
  const options = useMemo<ViewOptions>(() => ({
    lightingMode,
    lightCommand,
    selected,
    focusedRoom,
    interactionHints,
    view,
    cutaway,
    wallHeight,
    labels,
    dimensions,
    grid,
    drainage,
    layout,
    curtainColor,
    televisionMount,
    balconyRoofs,
    balconyModes,
    equipment,
  }), [lightingMode, lightCommand, selected, focusedRoom, interactionHints, view, cutaway, wallHeight, labels,
    dimensions, grid, drainage, layout, curtainColor, televisionMount,
    balconyRoofs, balconyModes, equipment]);

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
          <ThemeSwitch />
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
          <button className="text-button model-cad-button" onClick={onOpenCad}>
            <Icon name="layers" size={17} /> CAD 图纸
          </button>
          <button className="text-button model-guide-button" onClick={onBack} aria-label="户型资料" title="户型资料与实拍">
            <Icon name="plan" size={17} /> 户型资料
          </button>
          <button
            className="text-button source-button"
            onClick={() => { closeControlPanel(); setShowSource(true); }}
          >
            <Icon name="info" size={17} />
            模型说明
          </button>
          <ModelMobileActions onCad={onOpenCad} onSource={() => { closeControlPanel(); setShowSource(true); }}
            onSettings={() => setControlPanel({ kind: "display", closing: false })} />
        </div>
      </header>
      <main className="workspace">
        <aside className="sidebar" aria-label="户型与空间">
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
              <button type="button" className={`room-button ${!focusedRoom ? "is-active" : ""}`}
                aria-pressed={!focusedRoom} onClick={() => chooseRoom(null)}>
                <span className="room-index"><Icon name="cube" size={16} /></span>
                <span>整屋总览</span><Icon name="chevron" size={14} />
              </button>
              {rooms.map((item, index) => (
                <button
                  key={item.id}
                  className={`room-button ${focusedRoom === item.id ? "is-active" : ""}`}
                  aria-pressed={focusedRoom === item.id}
                  onClick={() => chooseRoom(item.id)}
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
          <div className="sidebar-footer">
            <Icon name="layers" size={17} />
            <span>
              图纸空间 + 现场外观参考<span>摆放为示意 · 尺寸待现场复测</span>
            </span>
          </div>
        </aside>
        <section className="viewport" data-lighting={lightingMode} data-room-view={focusedRoom ? "room" : "overview"} aria-label="交互式户型查看器">
          <div ref={toolbar} className="model-toolbar" role="group" aria-label="模型查看工具">
            <ModelRoomPicker focusedRoom={focusedRoom} onChoose={chooseRoom} onOpen={closeControlPanel} />
            <div className="view-switch" role="group" aria-label="切换视角" data-selection={view === "perspective" ? 0 : 1}>
              <span className="model-switch-indicator" aria-hidden="true" />
              <button
                aria-pressed={view === "perspective"}
                className={view === "perspective" ? "active" : ""}
                onClick={() => setView("perspective")}
              >
                <Icon name="cube" size={18} />
                三维
              </button>
              <button
                aria-pressed={view === "plan"}
                className={view === "plan" ? "active" : ""}
                onClick={() => setView("plan")}
              >
                <Icon name="plan" size={18} />
                俯视
              </button>
            </div>
            <div className="view-switch lighting-switch toolbar-daylight" role="group" aria-label="切换白天或黑夜" data-selection={lightingMode === "day" ? 0 : 1}>
              <span className="model-switch-indicator" aria-hidden="true" />
              <button aria-pressed={lightingMode === "day"}
                className={lightingMode === "day" ? "active" : ""}
                onClick={() => setLightingMode("day")}>
                <Icon name="sun" size={17} /> 白天
              </button>
              <button aria-pressed={lightingMode === "night"}
                className={lightingMode === "night" ? "active" : ""}
                onClick={() => setLightingMode("night")}>
                <Icon name="moon" size={17} /> 黑夜
              </button>
            </div>

            <div className="model-toolbar-actions">
              <button type="button" className="model-toolbar-action" aria-haspopup="dialog"
                aria-expanded={controlPanel?.kind === "scheme"} onClick={() => toggleControlPanel("scheme")}>
                <Icon name="sliders" size={17} /><span>方案</span>
              </button>
              <button type="button" className="model-toolbar-action" aria-haspopup="dialog"
                aria-expanded={controlPanel?.kind === "display"} onClick={() => toggleControlPanel("display")}>
                <Icon name="layers" size={17} /><span>显示</span>
              </button>
            </div>
            <div className="view-switch lighting-switch toolbar-lights" role="group" aria-label="全屋灯光"
              title={lightState.mixed ? "部分灯光已开启" : "全屋灯光"}
              data-selection={lightState.mixed ? "mixed" : lightState.on ? 0 : 1}>
              <span className="model-switch-indicator" aria-hidden="true" />
              <button type="button" aria-pressed={lightState.on} disabled={layout === "empty"}
                onClick={() => commandLights(true)}>开灯</button>
              <button type="button" aria-pressed={!lightState.on && !lightState.mixed} disabled={layout === "empty"}
                onClick={() => commandLights(false)}>关灯</button>
            </div>
            <button type="button" className="model-hints-toggle" aria-pressed={interactionHints}
              onClick={() => setInteractionHints((current) => !current)}>
              <Icon name="info" size={18} /><span>交互提示</span>
            </button>
          </div>
          {controlPanel ? <ModelControlPanel key={controlPanel.kind} title={controlPanel?.kind === "scheme" ? "空间方案" : "显示设置"}
            anchor={toolbar} closeRequested={controlPanel.closing} onClose={closeControlPanel}>
            {controlPanel?.kind === "scheme" ? <section className="model-scheme-settings" aria-label="空间方案对比">
            <div className="layout-preview-heading">
              <div className="preview-tabs" role="group" aria-label="选择对比内容" data-selection={previewTab === "living" ? 0 : previewTab === "balconies" ? 1 : 2}>
                <span className="model-switch-indicator" aria-hidden="true" />
                <button aria-pressed={previewTab === "living"} onClick={() => setPreviewTab("living")}>
                  客厅摆放
                </button>
                <button aria-pressed={previewTab === "balconies"} onClick={() => setPreviewTab("balconies")}>
                  阳台封窗
                </button>
                <button aria-pressed={previewTab === "curtains"} onClick={() => setPreviewTab("curtains")}>
                  窗帘颜色
                </button>
              </div>
              <small>效果预览</small>
            </div>
            <div className="preview-tab-content" key={previewTab}>
            {previewTab === "living" ? <>
              <div className="layout-switch" role="group" aria-label="切换客厅摆放">
                <button aria-pressed={layout === "empty"} onClick={() => setLayout("empty")}>
                  只看毛坯
                </button>
                {livingLayouts.map((item) => (
                  <button
                    key={item.id}
                    aria-pressed={layout === item.id}
                    aria-label={`${item.name}：${item.description}`}
                    onClick={() => setLayout(item.id)}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
              <div className="television-mount-row">
                <span>电视</span>
                <div className="layout-switch television-mount-switch" role="group" aria-label="电视安装方式">
                  {televisionMounts.map((item) => (
                    <button
                      key={item.id}
                      aria-pressed={televisionMount === item.id}
                      aria-label={`电视：${item.label}`}
                      disabled={layout === "empty"}
                      onClick={() => setTelevisionMount(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <p aria-live="polite">
                {currentLayout?.description ?? "已隐藏室内家具，选择方案恢复预览"}
              </p>
            </> : previewTab === "curtains" ? <>
              <div className="curtain-color-choices" role="group" aria-label="全屋窗帘颜色">
                {curtainColors.map((item) => (
                  <button key={item.id} aria-label={`窗帘：${item.label}`}
                    aria-pressed={curtainColor === item.id} onClick={() => setCurtainColor(item.id)}>
                    <span className="curtain-color-dot" style={{ backgroundColor: item.color }} aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
              <p aria-live="polite">当前：{curtainColors.find((item) => item.id === curtainColor)?.label} · 应用于全屋窗帘</p>
              {layout === "empty" ? <button className="curtain-restore-button" onClick={() => setLayout("tv-guest")}>
                显示窗帘与家具
              </button> : <p>点击模型里的窗帘，可单独切换开合。</p>}
            </> : <>
              {balconyChoices.map((item) => (
                <div className="balcony-option-row" key={item.id}>
                  <span>{item.name}</span>
                  <div className="layout-switch balcony-switch" role="group" aria-label={`${item.name}方案`}>
                    {(["original", "enclosed"] as const).map((mode) => (
                      <button
                        key={mode}
                        aria-label={`${item.name}：${balconyModeLabels[mode]}`}
                        aria-pressed={balconyModes[item.id] === mode}
                        onClick={() => setBalconyModes((current) => ({ ...current, [item.id]: mode }))}
                      >
                        {balconyModeLabels[mode]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <p className="balcony-preview-summary" aria-live="polite">
                主阳台：{balconyModeLabels[balconyModes.balcony]} · 生活阳台：{balconyModeLabels[balconyModes.utility]}
              </p>
              <p className="balcony-preview-note">整面通高玻璃，预览中不显示原栏杆；窗框与开启方式待定。</p>
            </>}
            </div>
            </section> : <>
          <section className="model-display-settings" aria-label="模型显示设置">
            <fieldset className="model-settings-group">
              <legend>空间外观</legend>
              <div className="model-settings-rows">
                <Toggle label="半高墙" description="截低墙体，看清房间内部" checked={cutaway} onChange={setCutaway} />
                <Toggle label="阳台顶板" description="半高墙或俯视时半透明显示" checked={balconyRoofs} onChange={setBalconyRoofs} />
                <Toggle label="阳台设备" description="显示洗衣机、热水器等设备" checked={equipment} onChange={setEquipment} />
              </div>
            </fieldset>
            <fieldset className="model-settings-group">
              <legend>辅助信息</legend>
              <div className="model-settings-rows">
                <Toggle label="房间名称" checked={labels} onChange={setLabels} />
                <Toggle label="图纸轴线尺寸" checked={dimensions} onChange={setDimensions} />
                <Toggle label="参考网格" checked={grid} onChange={setGrid} />
                <Toggle label="排水坡向示意" description="显示排水箭头与坡度标注" checked={drainage} onChange={setDrainage} />
              </div>
              {focusedRoom ? <p className="setting-note">房间视角暂时隐藏名称与整屋轴线，返回总览后恢复。</p> : null}
              {drainage ? <p className="setting-note">地漏位置、坡度与排水接管待现场确认。</p> : null}
            </fieldset>
            <fieldset className="model-settings-group">
              <legend>墙体高度</legend>
              <div className="height-control model-settings-rows">
                <div>
                  <label htmlFor="wall-height">完整墙高</label>
                  <output htmlFor="wall-height">{wallHeight.toFixed(2)} <span>m</span></output>
                </div>
                <input id="wall-height" type="range" min="2.4" max="3.4" step="0.05" value={wallHeight}
                  disabled={cutaway} aria-describedby="wall-height-note"
                  onChange={(event) => setWallHeight(Number(event.target.value))} />
                <p id="wall-height-note">{cutaway ? "关闭半高墙后，可调整完整墙高" : "示意高度，待现场实测确认"}</p>
              </div>
            </fieldset>
          </section>

            </>}
          </ModelControlPanel> : null}
          <ModelViewer options={options} onSelect={setSelected} onLightStateChange={handleLightState} />
          <div className="orientation-marker" aria-hidden="true">
            <span className="axis-y">Y</span>
            <span className="axis-z">Z</span>
            <span className="axis-x">X</span>
            <i />
            <small>模型坐标</small>
          </div>
          {room ? roomDetailsOpen ? (
            <ModelRoomDetails key={room.id} room={room} onVisit={onVisit} focused={!!focusedRoom}
              onFocus={() => chooseRoom(room.id)} onClose={() => setRoomDetailsOpen(false)}
              summary={selectedBalcony ? balconyModeLabels[balconyModes[selectedBalcony.id]] : undefined} />
          ) : (
            <button type="button" className="room-details-trigger" aria-expanded={false}
              aria-controls="model-room-details" aria-label={`打开${room.name}房间介绍`}
              onClick={() => setRoomDetailsOpen(true)}>
              <Icon name="info" size={17} /> {room.name} · 房间介绍
            </button>
          ) : (
            <div className="view-invitation">
              <span className="hint-line" />
              {labels ? "点房间名称查看介绍" : "选择空间，查看房间内部"} · 进入房间后，点击圆点操作物品
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
    openDialogAtTitle(dialog);
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
          <h2 id="source-title" tabIndex={-1} data-dialog-title="">模型说明</h2>
          <button
            className="icon-button"
            aria-label="关闭模型说明"
            onClick={onClose}
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
              图纸中的房间关系、主要墙体、门窗位置与轴线尺寸；实拍中的墙面、窗框和栏板。两个阳台有顶板，已由你确认。
            </dd>
          </div>
          <div>
            <dt>仍是估值</dt>
            <dd>
              墙厚默认 0.20 m，墙高默认 2.80
              m；顶板厚度与高度、门窗高度、局部净尺寸和栏杆细部尚未实测。家具、电器是示意体量，未还原局部飘窗和设备平台。
            </dd>
          </div>
          <div>
            <dt>建模范围</dt>
            <dd>
              室内、两个阳台与一小段门外走廊；三个卧室、书房、两个卫生间和入户门可点击开合，厨房使用可点击开合的推拉门，主阳台入口新增可点击开合的玻璃推拉门。门扇默认打开，开向为示意；原有窗洞的窗扇默认关闭，点击窗扇、窗框或把手可独立推拉开合，窗型为预览；门外走廊与鞋柜按候选布局展示，鞋柜两扇门默认关闭，一个按钮或任意柜门、把手控制双门同步开合，打开可见内部层板；范围和尺寸待现场确认。客厅可切换两种电视、沙发布局，沙发前加浅胡桃色茶几，电视可放柜上或挂墙，点击屏幕可亮屏或熄屏，开关状态随布局保留；面对电视时，左侧加浅胡桃色边柜，右侧加盆栽。挂墙高度和支架为示意，半高墙时保留电视后方一小段原有墙体以显示连接关系。主卧、次卧 A/B 各暂放一张无床头板的抽屉收纳床，每张床一个按钮控制所有抽屉，点击任意抽屉或床垫也会同步拉出或收回；次卧 B 仅向通道侧拉出。三个卧室各配浅胡桃色床头柜和靠墙衣柜，每个床头柜的两个抽屉由一个按钮同步拉出或收回，主卧与次卧 A 衣柜各四扇窄门，次卧 B 衣柜三扇窄门，每个衣柜由一个按钮同步开合全部柜门，床头灯在白天默认关闭，切换黑夜时默认开启，点击灯罩、灯杆或底座可独立开关暖光。原客房改为书房，沿墙放浅胡桃色电脑桌和电脑，配深灰色人体工学椅，点击椅子可从桌下拉出或收回，点击电脑显示器或主机可亮屏或熄屏，旁边放空的玻璃展示柜，两扇柜门默认关闭，一个按钮控制双门同步开合；厨房沿墙布置橱柜台面，配双头燃气灶，两个炉头默认关闭，一个交互按钮同步开火、关火，点击任一炉头或旋钮也控制两边；另有抽油烟机、水槽和可点击开关水的水龙头，厨房与两个卫生间窗户上方均有可点击启动、停止的排气扇，入口旁墙角放冰箱，上下两扇门可独立点击开合，两个卫生间进门左侧先是洗手台与镜子，公卫使用白色蹲厕，主卫保留白色马桶，马桶盖默认关闭，点击盖板或提示圆点可开合；洗手台背面贴墙，左侧边也贴相邻侧墙；镜子采用无框浅灰蓝纯色示意，不渲染实时反射，两个洗手台的水龙头可点击开关水，台下柜底部离地约 0.30 m，淋浴区玻璃门可独立点击开合，里面有花洒和金属格栅地漏。两个卫生间的淋浴区按 1.5% 坡度找向左上角地漏；玻璃隔断外的干区各预留一处候选地漏，按 1% 找坡。主阳台新增候选地漏与 1% 找坡，厨房新增候选地漏与 1% 找坡，地漏周边示意局部加大坡度。显示设置中的「排水坡向示意」可打开箭头和坡度标注，选中空间后只显示该空间。候选位置不代表现场已有排水口；干区和厨房地漏需结合清洁习惯、防臭措施、原排水接口与防水设计决定，阳台雨水与室内生活排水接法需现场核实。餐厅放一桌四椅，主阳台两侧摆放一高一低的羽状叶树形盆栽，配陶土花盆，中间留入口通道。客餐厅、阳台、卧室与书房地面统一预览浅木色木纹砖，厨房和两个卫生间为白色地砖；厨房和卫生间内侧墙面铺白色瓷砖，其余墙面保留暖米白，室内墙脚配白色踢脚线，门洞处断开。砖色、铺法和规格为效果示意。床架、餐桌、餐椅、沙发和电视柜统一采用浅胡桃色系。主卧、次卧、书房及主阳台入口有米黄色轻透纱帘，默认两侧拉开，点击可独立切换开合。三个卧室和书房各有壁挂空调，客厅主阳台旁暂放柜机。卧室、书房、阳台与玄关配顶灯，厨卫配平板灯，餐桌上方配吊灯，客厅预览六盏筒灯并分左右两组开关，过道另配筒灯。白天灯具默认关闭，切换黑夜时顶灯与床头灯自动开启，仍可点击独立开关，也可用画布顶部常驻的「开灯／关灯」按钮统一控制；选房间或调整其他设置不会重置灯光。顶灯随墙高定位，俯视时隐藏以保持平面图清晰。灯位与灯光效果为示意，吊顶、照度和配电回路待设计确认。新增家具跟随「只看毛坯」隐藏，产品、尺寸和点位均未定案。两个阳台各自对比保持原样和落地玻璃，生活阳台默认落地玻璃，主阳台默认原样；落地玻璃预览从地面通至顶板，只留周边细框并隐藏原栏杆，窗框与开启方式待定，不代表已实施。洗衣机、热水器标在生活阳台靠厨房侧，洗衣机门可点击开合；旁边放扫地机器人和固定充电座，点击机器人开始清扫，生活阳台独立视图只清扫阳台内，总览中按预设路线走过生活阳台与客餐厅；再次点击暂停或继续，完成后回到充电座；实际摆放需保持干燥、避开溅水和直晒，按所选机型预留回充空间。设备上下关系和安装高度仅作示意。不含电梯及公共管井，其余房间用途仍可调整。
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
