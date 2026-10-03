import { Icon } from "../icons";
import { roomGuides } from "../guide/content";
import { photosForRoom, roomVisits, sitePhotos } from "./content";
import { PhotoGallery } from "./PhotoGallery";
import { Walkthrough } from "./Walkthrough";
import "./visit.css";

export function SiteVisit({
  roomId,
  onRoomChange,
  onPlan,
  onModel,
  onSource,
}: {
  roomId: string;
  onRoomChange: (room: string) => void;
  onPlan: () => void;
  onModel: () => void;
  onSource: () => void;
}) {
  const room = roomGuides.find((item) => item.id === roomId)!;
  const visit = roomVisits.find((item) => item.roomId === roomId)!;
  return (
    <div className="site-visit">
      <div className="visit-heading">
        <div>
          <h2>毛坯现场</h2>
          <p>按房间看照片，对照交付时的样子。</p>
        </div>
        <span>{sitePhotos.length} 张照片 · 1 段视频</span>
      </div>
      <div
        className="guide-room-chips visit-room-chips"
        role="group"
        aria-label="选择实拍房间"
      >
        {roomGuides.map((item) => (
          <button
            key={item.id}
            aria-pressed={roomId === item.id}
            onClick={() => onRoomChange(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="visit-room-layout">
        <PhotoGallery
          key={roomId}
          photos={photosForRoom(roomId)}
          roomName={room.name}
        />
        <aside className="visit-room-notes" aria-labelledby="visit-room-title">
          <p className="guide-kicker">现场记录</p>
          <h2 id="visit-room-title">{room.name}</h2>
          <section>
            <h3>
              <span className="visit-note-dot" />
              现场看到
            </h3>
            <ul>
              {visit.observed.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </section>
          <section className="visit-measure">
            <h3>
              <span className="visit-note-dot" />
              还要测量
            </h3>
            <ul>
              {visit.measure.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </section>
          <div className="visit-location-links">
            <button onClick={onPlan}>
              <Icon name="plan" size={16} />
              平面位置
            </button>
            <button onClick={onModel}>
              <Icon name="cube" size={16} />
              三维位置
            </button>
            <button onClick={onSource}>
              <Icon name="layers" size={16} />
              相关图纸
            </button>
          </div>
        </aside>
      </div>
      <p className="visit-evidence-note">
        <Icon name="info" size={16} />
        照片来自你提供的房间分组；窗台、层高和管线等具体尺寸仍需现场测量。
      </p>
      <Walkthrough roomName={room.name} roomStart={visit.videoStart} />
    </div>
  );
}
