import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons";
import { firstSteps, glossary, roomGuides, sheets } from "./content";
import "./guide.css";

type Tab = "rooms" | "reading" | "sources";

export default function HomeGuide({
  onModel,
  onCad,
  onLock,
}: {
  onModel: () => void;
  onCad: () => void;
  onLock?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("rooms");
  const [selected, setSelected] = useState("living");
  const [page, setPage] = useState<number | null>(null);
  const room = roomGuides.find((r) => r.id === selected)!;
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <div className="home-guide">
      <header className="guide-header">
        <a className="guide-brand" href="./">
          <span className="brand-mark">
            <Icon name="home" size={21} />
          </span>
          <span>
            我的家<small>一本慢慢读懂的房屋说明书</small>
          </span>
        </a>
        <nav aria-label="查看方式">
          {onLock ? <button onClick={onLock}>锁定访问</button> : null}
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
            <h1>先认识家，再开始装修。</h1>
            <p className="guide-lead">
              从一张图开始，弄清每个房间，再一起决定怎么住。
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
          className="guide-tabbar"
          role="tablist"
          aria-label="房屋说明书章节"
        >
          {(
            [
              ["rooms", "01", "认识房间"],
              ["reading", "02", "图纸怎么看"],
              ["sources", "03", "查原图"],
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
                const ids: Tab[] = ["rooms", "reading", "sources"];
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
                      ? 2
                      : (ids.indexOf(tab) + offset + 3) % 3;
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
        <div id="guide-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === "rooms" ? (
            <>
              <section className="guide-room-layout">
                <div className="guide-plan-card">
                  <div className="guide-card-heading">
                    <div>
                      <h2>这是你家的户型原图</h2>
                      <p>点图中的房间名称，查看对应的通俗解释。</p>
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
                    {roomGuides.map((r) => (
                      <button
                        key={r.id}
                        aria-pressed={selected === r.id}
                        onClick={() => setSelected(r.id)}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                </div>
                <aside
                  className="guide-room-detail"
                  aria-labelledby="selected-room-title"
                  aria-live="polite"
                >
                  <div className="guide-detail-top">
                    <span className="guide-kicker">把图纸翻译成生活</span>
                    <span className="guide-room-number">
                      {String(roomGuides.indexOf(room) + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h2 id="selected-room-title">{room.name}</h2>
                  <p className="guide-original-name">
                    原图名称：{room.original}
                  </p>
                  <div className="guide-detail-section">
                    <span className="guide-label">原图能确认的</span>
                    <p>{room.fact}</p>
                    <button
                      className="guide-source-link"
                      onClick={() => setPage(room.page)}
                    >
                      查看依据 · PDF 第 {room.page} 页 ↗
                    </button>
                  </div>
                  <div className="guide-detail-section guide-idea">
                    <span className="guide-label">结合你家的想法 · 待商量</span>
                    <p>{room.idea}</p>
                  </div>
                  <div className="guide-detail-section">
                    <h3>和家人一起想一想</h3>
                    <ul>
                      {room.questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
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
                  <span className="guide-kicker">装修的第一步</span>
                  <h2>现在不用急着选风格。</h2>
                  <p>先把房子和一家人的需求弄清楚。</p>
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
                <span className="guide-kicker">不用先学会 CAD</span>
                <h2>先读懂这几个标记</h2>
                <p>每条解释都能回到你家的图纸上对照。</p>
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
                  <span className="guide-kicker">灯装在哪里？</span>
                  <h2>先看灯位，再讨论怎么开关。</h2>
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
                <span className="guide-kicker">每个解释，都有来处</span>
                <h2>你家的原图，已经放好了。</h2>
                <p>无需再上传。点开一张，查看它回答的是哪个问题。</p>
              </div>
              <div className="guide-sheet-grid">
                {sheets.map((s) => (
                  <button
                    className="guide-sheet-card"
                    key={s.page}
                    onClick={() => setPage(s.page)}
                  >
                    <img
                      src={`/house/d-sheet-${s.page}.webp`}
                      loading="lazy"
                      alt={`D 户型${s.title}缩略图`}
                    />
                    <div>
                      <span>
                        PDF · 第 {s.page} 页 · {s.code}
                      </span>
                      <h3>{s.simple}</h3>
                      <p>{s.title}</p>
                    </div>
                    <Icon name="chevron" size={18} />
                  </button>
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
                <h3>目前读到了哪里</h3>
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
          <span>我的家 · 从看懂，到住好</span>
          <span>原图 → 通俗解释 → 家人的决定</span>
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
  const [zoom, setZoom] = useState(false);
  const sheet = sheets.find((s) => s.page === page)!;
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="guide-dialog"
      onCancel={onClose}
      aria-labelledby="sheet-dialog-title"
    >
      <header>
        <div>
          <span>
            住宅 D 户型 · PDF 第 {page} 页 · {sheet.code}
          </span>
          <h2 id="sheet-dialog-title">{sheet.simple}</h2>
        </div>
        <button onClick={onClose} aria-label="关闭原图">
          <Icon name="close" />
        </button>
      </header>
      <p className="guide-dialog-description">{sheet.detail}</p>
      <div className="guide-dialog-tools">
        <button onClick={() => setZoom(!zoom)}>
          {zoom ? "适合窗口" : "放大细节"}
        </button>
        <a
          href={`/house/d-sheet-${page}.webp`}
          target="_blank"
          rel="noreferrer"
        >
          单独打开图片 ↗
        </a>
        <span>2019.03 · 原设计图</span>
      </div>
      <div className="guide-dialog-image">
        <img
          className={zoom ? "is-zoomed" : ""}
          src={`/house/d-sheet-${page}.webp`}
          alt={`住宅 D 户型${sheet.title}原图，${sheet.code}`}
        />
      </div>
    </dialog>
  );
}
