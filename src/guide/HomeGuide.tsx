import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AppIcon } from "../AppIcon";
import { Icon } from "../icons";
import { firstSteps, glossary, roomGuides, sheets } from "./content";
import { SheetCard } from "./SheetCard";
import { guideTabs, type GuideTab } from "../navigation";
import { SiteVisit } from "../visit/SiteVisit";
import { photosForRoom, photoUrl } from "../visit/content";
import "./guide.css";

export default function HomeGuide({
  tab,
  selected,
  onTabChange: setTab,
  onRoomChange: setSelected,
  onPlan,
  onVisit,
  photoIndices,
  onPhotoChange,
  onModel,
  onCad,
  onLock,
}: {
  tab: GuideTab;
  selected: string;
  onTabChange: (tab: GuideTab) => void;
  onRoomChange: (room: string) => void;
  onPlan: () => void;
  onVisit: () => void;
  photoIndices: Record<string, number>;
  onPhotoChange: (room: string, index: number) => void;
  onModel: () => void;
  onCad: () => void;
  onLock?: () => void;
}) {
  const [page, setPage] = useState<number | null>(null);
  const room = roomGuides.find((r) => r.id === selected)!;
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <div className="home-guide">
      <header className="guide-header">
        <a className="guide-brand" href="./">
          <AppIcon />
          <span>我的家</span>
        </a>
        <nav aria-label="查看方式">
          {onLock ? (
            <button
              className="guide-lock-button"
              onClick={onLock}
              aria-label="锁定访问"
              title="锁定访问"
            >
              <Icon name="lock" size={17} />
            </button>
          ) : null}
          <button onClick={onCad}>
            <Icon name="layers" size={16} /> 电气图
          </button>
          <button className="guide-model-button" onClick={onModel}>
            <Icon name="cube" size={16} /> 毛坯三维
          </button>
        </nav>
      </header>
      <main className="guide-main">
        <section className="guide-intro">
          <div>
            <p className="guide-kicker">佛山 · 碧桂园世纪滨江 · D 户型</p>
            <h1>户型与装修资料</h1>
            <p className="guide-lead">
              对照现场照片、房间布局和原始图纸，逐步确认装修需求。
            </p>
          </div>
          <div className="guide-house-facts" aria-label="原图空间组成">
            <span>
              <b>4</b>个房间
            </span>
            <span>
              <b>2</b>个卫生间
            </span>
            <span>
              <b>2</b>个阳台
            </span>
            <small>按原图布局 · 已确认毛坯交付</small>
          </div>
        </section>
        <div
          id="guide-browse"
          className="guide-tabbar"
          style={
            {
              "--tab-index": guideTabs.indexOf(tab),
            } as CSSProperties
          }
          role="tablist"
          aria-label="户型资料分类"
        >
          <span className="guide-tab-indicator" aria-hidden="true" />
          {(
            [
              ["rooms", "01", "房间布局"],
              ["visit", "02", "现场实拍"],
              ["reading", "03", "图纸说明"],
              ["sources", "04", "原始图纸"],
            ] as const
          ).map(([id, num, title]) => (
            <button
              key={id}
              id={`tab-${id}`}
              role="tab"
              aria-selected={tab === id}
              aria-controls="guide-panel"
              tabIndex={tab === id ? 0 : -1}
              onKeyDown={(event) => {
                const ids = guideTabs;
                const offset =
                  event.key === "ArrowRight"
                    ? 1
                    : event.key === "ArrowLeft"
                      ? -1
                      : 0;
                if (!offset && event.key !== "Home" && event.key !== "End")
                  return;
                event.preventDefault();
                const index =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? ids.length - 1
                      : (ids.indexOf(tab) + offset + ids.length) % ids.length;
                setTab(ids[index]);
                document.getElementById(`tab-${ids[index]}`)?.focus();
              }}
              onClick={() => setTab(id)}
            >
              <span>{num}</span>
              {title}
            </button>
          ))}
        </div>
        <div
          key={tab}
          id="guide-panel"
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
        >
          {tab === "visit" ? (
            <SiteVisit
              roomId={selected}
              onRoomChange={setSelected}
              onPlan={onPlan}
              photoIndex={photoIndices[selected] ?? 0}
              onPhotoChange={(index) => onPhotoChange(selected, index)}
              onModel={onModel}
              onSource={() => setPage(room.page)}
            />
          ) : null}
          {tab === "rooms" ? (
            <>
              <section className="guide-room-layout">
                <div id="room-plan" className="guide-plan-card" tabIndex={-1}>
                  <div className="guide-card-heading">
                    <div>
                      <h2>户型平面图</h2>
                      <p>选择下方房间，查看现场、布局和准备事项。</p>
                    </div>
                    <button
                      className="guide-text-link"
                      onClick={() => setPage(1)}
                    >
                      放大原图 <Icon name="plus" size={14} />
                    </button>
                  </div>
                  <div className="guide-plan" aria-label="D 户型房间选择图">
                    <img
                      src="/house/d-plan.webp"
                      width="1500"
                      height="1000"
                      alt="D 户型墙体原图：左侧入户、厨房与客房，中间客餐厅，右侧三个房间和两个卫生间，上下各一个阳台"
                      onError={() => setImageFailed(true)}
                    />
                    {imageFailed ? (
                      <p className="guide-image-error" role="alert">
                        户型图加载失败，请刷新页面；仍可用下方房间列表阅读。
                      </p>
                    ) : null}
                    {roomGuides.map((r, i) => (
                      <span key={`marker-${r.id}`} className={`guide-map-number ${selected === r.id ? "is-selected" : ""}`}
                        style={{ left: `${(r.point[0] / 750) * 100}%`, top: `${(r.point[1] / 500) * 100}%` }} aria-hidden="true">
                        {i + 1}
                      </span>
                    ))}
                    {roomGuides.map((r, i) => (
                      <button
                        key={r.id}
                        className={`guide-pin ${selected === r.id ? "is-selected" : ""}`}
                        style={{
                          left: `${(r.point[0] / 750) * 100}%`,
                          top: `${(r.point[1] / 500) * 100}%`,
                        }}
                        aria-label={`查看${r.name}`}
                        aria-pressed={selected === r.id}
                        onClick={() => setSelected(r.id)}
                      >
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        {r.name}
                      </button>
                    ))}
                  </div>
                  <div className="guide-plan-footer">
                    <span>
                      <i /> 原图上的房间导览
                    </span>
                    <span>电梯、公共管井不属于户内</span>
                  </div>
                  <div className="guide-room-chips" aria-label="选择房间">
                    {roomGuides.map((r, i) => (
                      <button
                        key={r.id}
                        aria-pressed={selected === r.id}
                        onClick={() => setSelected(r.id)}
                      >
                        <span className="guide-chip-number" aria-hidden="true">{i + 1}</span>{r.name}
                      </button>
                    ))}
                  </div>
                </div>
                <aside
                  id="room-detail"
                  tabIndex={-1}
                  className="guide-room-detail"
                  aria-labelledby="selected-room-title"
                  aria-live="polite"
                >
                  <div key={room.id} className="guide-detail-content">
                    <div className="guide-detail-top">
                      <span className="guide-kicker">房间详情</span>
                      <span className="guide-room-number">
                        {String(roomGuides.indexOf(room) + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h2 id="selected-room-title">{room.name}</h2>
                    <button className="guide-back-plan guide-source-link" onClick={onPlan}>返回平面图 ↑</button>
                    <p className="guide-original-name">
                      原图名称：{room.original}
                    </p>
                    <button
                      className="guide-visit-link"
                      onClick={onVisit}
                    >
                      <img
                        src={photoUrl(photosForRoom(room.id)[0], true)}
                        alt=""
                        width="64"
                        height="64"
                        loading="lazy"
                      />
                      <span>
                        <b>查看现场照片</b>
                        <small>
                          {photosForRoom(room.id).length} 张实拍 · {room.name}
                        </small>
                      </span>
                      <Icon name="chevron" size={16} />
                    </button>
                    <div className="guide-detail-section">
                      <span className="guide-label">图纸信息</span>
                      <p>{room.fact}</p>
                      <button
                        className="guide-source-link"
                        onClick={() => setPage(room.page)}
                      >
                        查看依据 · PDF 第 {room.page} 页 ↗
                      </button>
                    </div>
                    <div className="guide-detail-section guide-idea">
                      <span className="guide-label">使用建议 · 未确定</span>
                      <p>{room.idea}</p>
                    </div>
                    <div className="guide-detail-section">
                      <h3>需要确认</h3>
                      <ul>
                        {room.questions.map((q) => (
                          <li key={q}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </aside>
              </section>
              <div className="guide-evidence-note">
                <Icon name="info" size={18} />
                <p>
                  这张原图来自你提供的 <b>2019 年 D 户型设计图</b>
                  。房间关系可以据此理解；尺寸、点位和交付现状，还需要到毛坯现场逐项核对。
                </p>
              </div>
              <section className="guide-next">
                <div>
                  <h2>装修准备</h2>
                  <p>开工前需要确认的 4 件事。</p>
                </div>
                <ol>
                  {firstSteps.map((s, i) => (
                    <li key={s.title}>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <h3>{s.title}</h3>
                        <p>{s.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          ) : null}
          {tab === "reading" ? (
            <section className="guide-reading">
              <div className="guide-section-intro">
                <span className="guide-kicker">图纸基础</span>
                <h2>常用图纸标记</h2>
                <p>尺寸、轴线、标高和门窗代号的含义。</p>
              </div>
              <div className="guide-glossary">
                {glossary.map((g) => (
                  <article key={g.name}>
                    <span className="guide-symbol">{g.mark}</span>
                    <h3>{g.name}</h3>
                    <p>{g.text}</p>
                    <button
                      className="guide-source-link"
                      onClick={() => setPage(1)}
                    >
                      {g.source} ↗
                    </button>
                  </article>
                ))}
              </div>
              <div className="guide-lighting">
                <div>
                  <span className="guide-kicker">照明布局</span>
                  <h2>灯位与开关</h2>
                  <p>
                    PDF 第 5 页画了灯的位置和定位尺寸。第 6
                    页给灯具标了编号。DWG 的 ZD11
                    则补充电气布置与线路说明，几张图要对着看。
                  </p>
                  <p>
                    原电气图也说明：家具尺寸或摆放改变后，灯位应按改变后的布局复核。书房怎么用，应该先于灯位和插座定下来。
                  </p>
                  <div className="guide-inline-actions">
                    <button onClick={() => setPage(5)}>看灯位原图 ↗</button>
                    <button onClick={onCad}>打开 D 户型电气图 ↗</button>
                  </div>
                  <small>
                    依据：P-04-D、P-05-D；ZD11 右侧注释第 7
                    条。这里只解释原设计，不把它当成现场实测。
                  </small>
                </div>
                <button
                  className="guide-light-preview"
                  onClick={() => setPage(5)}
                  aria-label="放大灯位原图"
                >
                  <img
                    src="/house/d-sheet-5.webp"
                    loading="lazy"
                    alt="D 户型灯具开线图，显示各房间灯位与定位尺寸"
                  />
                </button>
              </div>
              <div className="guide-evidence-note">
                <Icon name="info" size={18} />
                <p>
                  墙能不能拆、线路是否符合现场条件，不能靠颜色、线粗或本页文字判断。需要结构资料、实测和对应专业人员核对。
                </p>
              </div>
            </section>
          ) : null}
          {tab === "sources" ? (
            <section className="guide-sources">
              <div className="guide-section-intro">
                <span className="guide-kicker">原始资料</span>
                <h2>住宅 D 户型图纸</h2>
                <p>共 7 张 PDF 图纸，可点击放大查看。</p>
              </div>
              <div className="guide-sheet-grid">
                {sheets.map((s) => (
                  <SheetCard key={s.page} sheet={s} onOpen={setPage} />
                ))}
              </div>
              <article className="guide-cad-source">
                <span className="guide-cad-icon">
                  <Icon name="layers" size={32} />
                </span>
                <div>
                  <span className="guide-kicker">来自你提供的 DWG</span>
                  <h3>D 户型电气平面图 · ZD11</h3>
                  <p>
                    从整套工程文件中单独提取，保留图层，可放大查看。图签为
                    2019.03，属于装修电气设计；图内也要求部分内容以毛坯电气图为准。
                  </p>
                  <small>
                    转换存在未识别对象，部分符号可能缺失。此版本尚未逐个核实全部插座、回路与现场位置。
                  </small>
                </div>
                <button onClick={onCad}>打开电气图 ↗</button>
              </article>
              <div className="guide-source-status">
                <h3>资料核对进度</h3>
                <p>
                  <b>已核对：</b>PDF 的 7 张图名、房间关系与主要标记；DWG 中的 D
                  户型 ZD11 图签和图纸位置。
                </p>
                <p>
                  <b>还需要补齐：</b>
                  现场尺寸和交付点位、结构与毛坯水电资料、逐个电气符号和回路的核对。三维模型沿用人工估读的几何，不能作为施工尺寸。
                </p>
              </div>
            </section>
          ) : null}
        </div>
        <footer className="guide-footer">
          <span>碧桂园世纪滨江 · D 户型</span>
          <span>图纸资料：2019 年设计版本</span>
        </footer>
      </main>
      {page !== null ? (
        <SheetDialog key={page} page={page} onClose={() => setPage(null)} />
      ) : null}
    </div>
  );
}

function SheetDialog({ page, onClose }: { page: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(false);
  const [closing, setClosing] = useState(false);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  const source = `/house/d-sheet-${page}.webp`;
  const imageSource = attempt ? `${source}?retry=${attempt}` : source;

  useEffect(() => {
    const element = image.current;
    if (element?.complete) {
      setStatus(element.naturalWidth > 0 ? "loaded" : "error");
    }
  }, [imageSource]);

  function retry() {
    setStatus("loading");
    setAttempt((value) => value + 1);
  }

  function requestClose() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      onClose();
    else setClosing(true);
  }
  const sheet = sheets.find((s) => s.page === page)!;
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`guide-dialog ${closing ? "is-closing" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onAnimationEnd={(event) => {
        if (
          event.target === event.currentTarget &&
          event.animationName === "sheet-out"
        )
          onClose();
      }}
      aria-labelledby="sheet-dialog-title"
    >
      <header>
        <div>
          <span>
            住宅 D 户型 · PDF 第 {page} 页 · {sheet.code}
          </span>
          <h2 id="sheet-dialog-title">{sheet.simple}</h2>
        </div>
        <button onClick={requestClose} aria-label="关闭原图">
          <Icon name="close" />
        </button>
      </header>
      <p className="guide-dialog-description">{sheet.detail}</p>
      <div className="guide-dialog-tools">
        <button onClick={() => setZoom(!zoom)} disabled={status !== "loaded"}>
          {zoom ? "适合窗口" : "放大细节"}
        </button>
        <a href={imageSource} target="_blank" rel="noreferrer">
          单独打开图片 ↗
        </a>
        <span>2019.03 · 原设计图</span>
      </div>
      <div
        className="guide-dialog-image"
        data-state={status}
        aria-busy={status === "loading"}
      >
        {status !== "loaded" ? (
          <img className="guide-dialog-preview" src={`/house/thumbnails/d-sheet-${page}.webp`} alt="" aria-hidden="true" />
        ) : null}
        <img
          key={imageSource}
          ref={image}
          className={zoom ? "is-zoomed" : ""}
          src={imageSource}
          decoding="async"
          alt={`住宅 D 户型${sheet.title}原图，${sheet.code}`}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
        {status !== "loaded" ? (
          <div className="guide-dialog-image-feedback">
            {status === "loading" ? (
              <span className="guide-sheet-spinner" aria-hidden="true" />
            ) : null}
            <p role="status">
              {status === "loading"
                ? "正在加载高清原图…"
                : "原图加载失败，请重试"}
            </p>
            {status === "error" ? (
              <button onClick={retry}>
                <Icon name="reset" size={16} />
                重新加载原图
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
