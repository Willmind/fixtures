import { useRef, useState } from "react";
import { videoChapters } from "./content";

export function Walkthrough({
  roomName,
  roomStart,
}: {
  roomName: string;
  roomStart?: number;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const desiredTime = useRef(0);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  function playAt(time: number) {
    desiredTime.current = time;
    if (failed) {
      setFailed(false);
      setAttempt((value) => value + 1);
      setWaiting(true);
    } else if (video.current && video.current.readyState >= 1) {
      video.current.currentTime = time;
      void video.current.play().catch(() => setWaiting(false));
    } else {
      setWaiting(true);
    }
    setStarted(true);
  }
  return (
    <section
      className="visit-video-section"
      aria-labelledby="visit-video-title"
    >
      <div className="visit-video-player">
        {started ? (
          <video
            key={attempt}
            ref={video}
            controls
            playsInline
            muted
            preload="metadata"
            poster="/site-visit/video-poster.webp?v=3"
            src={`/site-visit/walkthrough.mp4?v=3${attempt ? `&retry=${attempt}` : ""}`}
            aria-label="毛坯现场走拍视频"
            onLoadedMetadata={() => {
              if (!video.current) return;
              video.current.currentTime = desiredTime.current;
              void video.current.play().catch(() => setWaiting(false));
            }}
            onWaiting={() => setWaiting(true)}
            onPlaying={() => setWaiting(false)}
            onCanPlay={() => setWaiting(false)}
            onPause={() => setWaiting(false)}
            onError={() => {
              setFailed(true);
              setWaiting(false);
            }}
          />
        ) : (
          <button
            className="visit-video-poster"
            onClick={() => playAt(0)}
            aria-label="播放现场视频"
          >
            <img
              src="/site-visit/video-poster.webp?v=3"
              alt="从客厅看向室内的走拍画面"
              width="520"
              height="924"
              loading="lazy"
            />
            <span>
              <b aria-hidden="true">▶</b>播放现场视频
              <small>43 秒 · 无声版</small>
            </span>
          </button>
        )}
        {waiting ? (
          <span className="visit-video-waiting" role="status">
            <span className="visit-spinner" />
            正在加载视频…
          </span>
        ) : null}
        {failed ? (
          <div className="visit-video-error" role="alert">
            视频暂时未能加载
            <button onClick={() => playAt(desiredTime.current)}>
              重新加载
            </button>
          </div>
        ) : null}
      </div>
      <div className="visit-video-info">
        <p className="guide-kicker">走一遍，看看空间怎么连接</p>
        <h2 id="visit-video-title">现场走拍</h2>
        <p>
          照片用来看细节，视频用来认识动线。点击下方片段，可以跳到对应位置。
        </p>
        <div className="visit-chapters" role="group" aria-label="视频片段">
          {videoChapters.map((chapter) => (
            <button key={chapter.at} onClick={() => playAt(chapter.at)}>
              <span>00:{String(chapter.at).padStart(2, "0")}</span>
              {chapter.label}
              <span aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
        {roomStart !== undefined ? (
          <button className="guide-text-link" onClick={() => playAt(roomStart)}>
            跳到{roomName}附近 →
          </button>
        ) : null}
        <small>片段位置按画面整理；视频未覆盖所有房间的全部角度。</small>
      </div>
    </section>
  );
}
