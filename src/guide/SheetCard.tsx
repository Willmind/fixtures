import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons";
import type { sheets } from "./content";

export function SheetCard({
  sheet,
  onOpen,
}: {
  sheet: (typeof sheets)[number];
  onOpen: (page: number) => void;
}) {
  const image = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  const source = `/house/d-sheet-${sheet.page}.webp`;

  useEffect(() => {
    // Cached images may already be complete when the card mounts again.
    const element = image.current;
    if (element?.complete) {
      setStatus(element.naturalWidth > 0 ? "loaded" : "error");
    }
  }, [attempt]);

  function activate() {
    if (status === "error") {
      setStatus("loading");
      setAttempt((value) => value + 1);
    } else {
      onOpen(sheet.page);
    }
  }

  return (
    <button
      className="guide-sheet-card"
      onClick={activate}
      aria-busy={status === "loading"}
      aria-label={
        status === "error"
          ? `${sheet.simple}缩略图加载失败，点击重试`
          : `查看${sheet.simple}，PDF 第 ${sheet.page} 页`
      }
    >
      <span className="guide-sheet-preview" data-state={status}>
        <img
          key={attempt}
          ref={image}
          src={attempt ? `${source}?retry=${attempt}` : source}
          loading="lazy"
          decoding="async"
          alt={`D 户型${sheet.title}缩略图`}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
        {status !== "loaded" ? (
          <span className="guide-sheet-placeholder" aria-hidden="true">
            {status === "loading" ? (
              <span className="guide-sheet-spinner" />
            ) : (
              <Icon name="reset" size={20} />
            )}
            <span>
              {status === "loading" ? "正在加载图纸…" : "加载失败，点击重试"}
            </span>
          </span>
        ) : null}
      </span>
      <div className="guide-sheet-caption">
        <span>
          PDF · 第 {sheet.page} 页 · {sheet.code}
        </span>
        <h3>{sheet.simple}</h3>
        <p>{sheet.title}</p>
      </div>
      <Icon name="chevron" size={18} />
    </button>
  );
}
