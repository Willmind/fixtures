import { openDialogAtTitle } from "../dialogs/openDialog";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons";
import { warmImage } from "../guide/imageWarmup";
import { photoUrl, type SitePhoto } from "./content";

function PhotoImage({
  photo,
  thumbnail = false,
}: {
  photo: SitePhoto;
  thumbnail?: boolean;
}) {
  const image = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  const src = photoUrl(photo, thumbnail) + (attempt ? `?retry=${attempt}` : "");
  useEffect(() => {
    const img = image.current;
    if (img?.complete) setStatus(img.naturalWidth ? "ready" : "error");
  }, [src]);
  return (
    <div className={`visit-image ${status === "ready" ? "is-ready" : ""}`}>
      {!thumbnail && status !== "ready" ? (
        <img
          className="visit-image-preview"
          src={photoUrl(photo, true)}
          alt=""
          aria-hidden="true"
        />
      ) : null}
      <img
        ref={image}
        src={src}
        alt={thumbnail ? "" : photo.caption}
        width={photo.width}
        height={photo.height}
        loading={thumbnail ? "lazy" : "eager"}
        decoding="async"
        onLoad={() => setStatus("ready")}
        onError={() => setStatus("error")}
      />
      {status === "loading" ? (
        <span
          className="visit-image-status"
          role={thumbnail ? undefined : "status"}
        >
          <span className="visit-spinner" aria-hidden="true" />
          {thumbnail ? "" : "正在加载清晰照片…"}
        </span>
      ) : null}
      {status === "error" ? (
        <span
          className="visit-image-status"
          role={thumbnail ? undefined : "alert"}
        >
          {thumbnail ? (
            "未加载"
          ) : (
            <>
              照片暂时未能加载
              <button
                onClick={() => {
                  setStatus("loading");
                  setAttempt((value) => value + 1);
                }}
              >
                重新加载
              </button>
            </>
          )}
        </span>
      ) : null}
    </div>
  );
}

export function PhotoGallery({
  photos,
  roomName,
  index,
  onIndexChange: setIndex,
}: {
  index: number;
  onIndexChange: (index: number) => void;
  photos: SitePhoto[];
  roomName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const photo = photos[index];
  useEffect(() => {
    if (photos.length < 2) return;
    const timer = window.setTimeout(
      () => warmImage(photoUrl(photos[(index + 1) % photos.length])),
      500,
    );
    return () => window.clearTimeout(timer);
  }, [index, photos]);
  function move(offset: number) {
    setIndex((index + offset + photos.length) % photos.length);
  }
  return (
    <div className="visit-gallery">
      <div className="visit-main-photo">
        <PhotoImage key={photo.id} photo={photo} />
        <button
          className="visit-expand"
          onPointerEnter={() => warmImage(photoUrl(photo))}
          onFocus={() => warmImage(photoUrl(photo))}
          onClick={() => setExpanded(true)}
          aria-label={`放大${roomName}照片`}
        >
          <Icon name="plus" size={16} /> 放大
        </button>
      </div>
      <div className="visit-photo-caption" aria-live="polite">
        <p>{photo.caption}</p>
        <span>
          {index + 1} / {photos.length}
        </span>
      </div>
      <div
        className="visit-thumbnails"
        role="group"
        aria-label={`${roomName}照片选择`}
      >
        {photos.map((item, i) => (
          <button
            key={item.id}
            aria-pressed={i === index}
            aria-label={`照片 ${i + 1}：${item.caption}`}
            onPointerEnter={() => warmImage(photoUrl(item))}
            onFocus={() => warmImage(photoUrl(item))}
            onClick={() => setIndex(i)}
          >
            <PhotoImage photo={item} thumbnail />
          </button>
        ))}
      </div>
      {expanded ? (
        <PhotoDialog
          photo={photo}
          roomName={roomName}
          index={index}
          count={photos.length}
          onMove={move}
          onClose={() => setExpanded(false)}
        />
      ) : null}
    </div>
  );
}

function PhotoDialog({
  photo,
  roomName,
  index,
  count,
  onMove,
  onClose,
}: {
  photo: SitePhoto;
  roomName: string;
  index: number;
  count: number;
  onMove: (offset: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    if (element) openDialogAtTitle(element);
    return () => {
      element?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="visit-lightbox"
      aria-labelledby="visit-photo-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          onMove(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div className="visit-lightbox-content">
        <header>
          <h2 id="visit-photo-title" tabIndex={-1} data-dialog-title="">{roomName} · 现场照片</h2>
          <button onClick={onClose} aria-label="关闭照片">
            <Icon name="close" />
          </button>
        </header>
        <PhotoImage key={photo.id} photo={photo} />
        <footer>
          <button
            disabled={count < 2}
            onClick={() => onMove(-1)}
            aria-label="上一张照片"
          >
            ←
          </button>
          <p aria-live="polite">
            {photo.caption}
            <small>
              {index + 1} / {count}
            </small>
          </p>
          <button
            disabled={count < 2}
            onClick={() => onMove(1)}
            aria-label="下一张照片"
          >
            →
          </button>
        </footer>
      </div>
    </dialog>
  );
}
