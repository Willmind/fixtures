import { useEffect, useRef, useState } from "react";
import { ModelViewer } from "./ModelViewer";
import { AppIcon } from "./AppIcon";
import { Icon } from "./icons";
import { defaults, rooms } from "./model/plan";
import type { ViewOptions } from "./model/HomeScene";
import { photosForRoom } from "./visit/content";
import { balconyChoices, balconyModeLabels, curtainColors, livingLayouts } from "./model/arrangements";
import type { BalconyModes, CurtainColor, LayoutPreview } from "./model/arrangements";
import { televisionMounts } from "./model/furniture";
import type { TelevisionMount } from "./model/furniture";

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
  const [dimensions, setDimensions] = useState(true);
  const [grid, setGrid] = useState(true);
  const [layout, setLayout] = useState<LayoutPreview>("tv-guest");
  const [curtainColor, setCurtainColor] = useState<CurtainColor>(curtainColors[0].id);
  const [televisionMount, setTelevisionMount] = useState<TelevisionMount>("cabinet");
  const [balconyRoofs, setBalconyRoofs] = useState(true);
  const [balconyModes, setBalconyModes] = useState<BalconyModes>({ balcony: "original", utility: "enclosed" });
  const [previewTab, setPreviewTab] = useState<"living" | "balconies" | "curtains">("living");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [equipment, setEquipment] = useState(true);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const room = rooms.find((item) => item.id === selected);
  const currentLayout = livingLayouts.find((item) => item.id === layout);
  const selectedBalcony = balconyChoices.find((item) => item.id === selected);
  const options = {
    selected,
    view,
    cutaway,
    wallHeight,
    labels,
    dimensions,
    grid,
    layout,
    curtainColor,
    televisionMount,
    balconyRoofs,
    balconyModes,
    equipment,
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
          <button className="text-button model-guide-button" onClick={onBack} aria-label="户型资料" title="户型资料与实拍">
            <Icon name="plan" size={17} /> 户型资料
          </button>
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
            <Toggle label="阳台顶板" checked={balconyRoofs} onChange={setBalconyRoofs} />
            <p className="setting-note">半高墙、俯视时顶板半透明，完整墙高时显示实体。</p>
            <Toggle label="阳台设备" checked={equipment} onChange={setEquipment} />
            <p className="setting-note">已确定放在生活阳台靠厨房侧，机型与安装尺寸待定。</p>
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
              图纸空间 + 现场外观参考<span>摆放为示意 · 尺寸待现场复测</span>
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
          </div>
          <section className={`layout-preview${previewOpen ? "" : " is-collapsed"}`} aria-label="空间方案对比">
            <button className="preview-panel-toggle" aria-expanded={previewOpen} aria-controls="model-preview-controls"
              aria-label={previewOpen ? "收起方案面板" : "展开方案面板"}
              onClick={() => setPreviewOpen((open) => !open)}>
              <Icon name="sliders" size={16} />
              <span>{previewOpen ? "收起方案" : "展开方案"}</span>
              <Icon name="chevron" size={14} />
            </button>
            <div id="model-preview-controls" hidden={!previewOpen}>
            <div className="layout-preview-heading">
              <div className="preview-tabs" role="group" aria-label="选择对比内容">
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
          </section>
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
                {selectedBalcony ? (
                  <p className="room-option-summary">当前预览：{balconyModeLabels[balconyModes[selectedBalcony.id]]}</p>
                ) : null}
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
              点击门、窗帘或床底抽屉开合；可开合部件悬停显示手形
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
              室内、两个阳台与一小段门外走廊；三个卧室、书房、两个卫生间和入户门可点击开合，厨房使用可点击开合的推拉门，主阳台入口新增可点击开合的玻璃推拉门。门扇默认打开，开向为示意；门外走廊与鞋柜按候选布局展示，范围和尺寸待现场确认。客厅可切换两种电视、沙发布局，电视可放柜上或挂墙。挂墙高度和支架为示意，半高墙时保留电视后方一小段原有墙体以显示连接关系。主卧、次卧 A/B 各暂放一张无床头板的抽屉收纳床，点击抽屉可独立拉出或收回，点击床垫可统一开合该床抽屉；次卧 B 仅向通道侧拉出。原客房改为书房，沿墙放浅胡桃色电脑桌和电脑，配深灰色人体工学椅，旁边放空的玻璃展示柜，两扇柜门默认关闭，可分别点击开合；厨房沿墙布置橱柜台面，配燃气灶、抽油烟机、水槽和水龙头，入口旁墙角放冰箱，两个卫生间进门左侧依次为洗手台与镜子、马桶，洗手台背面贴墙，左侧边也贴相邻侧墙；镜子贴墙，台下柜底部离地约 0.30 m，淋浴区玻璃门可独立点击开合，里面有花洒和金属格栅地漏。餐厅放一桌四椅，主阳台两侧摆放一高一低的羽状叶树形盆栽，配陶土花盆，中间留入口通道。客餐厅、厨房、阳台、卧室与书房地面统一预览浅木色木纹砖，两个卫生间为白色地砖；厨房和卫生间内侧墙面铺白色瓷砖，其余墙面保留暖米白。砖色、铺法和规格为效果示意。床架、餐桌和餐椅采用浅胡桃木色。主卧、次卧、书房及主阳台入口有暖米白窗帘，默认两侧拉开，点击可独立切换开合。三个卧室和书房各有壁挂空调，客厅主阳台旁暂放柜机。新增家具跟随「只看毛坯」隐藏，产品、尺寸和点位均未定案。两个阳台各自对比保持原样和落地玻璃，生活阳台默认落地玻璃，主阳台默认原样；落地玻璃预览从地面通至顶板，只留周边细框并隐藏原栏杆，窗框与开启方式待定，不代表已实施。洗衣机、热水器标在生活阳台靠厨房侧，洗衣机旁暂放扫地机器人和小型充电座；实际摆放需保持干燥、避开溅水和直晒，按所选机型预留回充空间。设备上下关系和安装高度仅作示意。不含电梯及公共管井，其余房间用途仍可调整。
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
