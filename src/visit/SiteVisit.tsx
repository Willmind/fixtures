import { Icon } from "../icons";
import { roomGuides } from "../guide/content";
import { photosForRoom, roomVisits, sitePhotos } from "./content";
import { PhotoGallery } from "./PhotoGallery";
import { RoomLocation } from "./RoomLocation";
import { RoomNotebook } from "../notes/RoomNotebook";
import { Walkthrough } from "./Walkthrough";
import "./visit.css";

export function SiteVisit({
  roomId,
  onRoomChange,
  photoIndex,
  onPhotoChange,
  onNotes,
  onPlan,
  onModel,
  onSource,
}: {
  roomId: string;
  onRoomChange: (room: string) => void;
  photoIndex: number;
  onPhotoChange: (index: number) => void;
  onNotes: () => void;
  onPlan: () => void;
  onModel: () => void;
  onSource: () => void;
}) {
  const room = roomGuides.find((item) => item.id === roomId)!;
  const visit = roomVisits.find((item) => item.roomId === roomId)!;
  return (
    <div id="visit-room" className="site-visit" tabIndex={-1}>
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
      <div className="visit-context-bar">
        <RoomLocation roomId={roomId} onPlan={onPlan} />
        <button className="visit-prepare-button" onClick={onNotes}>
          记录{room.name}的准备事项 ↓
        </button>
      </div>
      <div className="visit-room-layout">
        <PhotoGallery
          key={roomId}
          photos={photosForRoom(roomId)}
          index={photoIndex}
          onIndexChange={onPhotoChange}
          roomName={room.name}
        />
        <aside className="visit-room-notes" aria-labelledby="visit-room-title">
          <p className="guide-kicker">
            <span className="evidence-badge is-observed">现场实拍</span>
          </p>
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
          <section className="visit-next-step">
            <h3>下一步</h3>
            <p>{visit.measure[0]}</p>
            <button className="guide-source-link" onClick={onNotes}>
              打开测量与确认清单 →
            </button>
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
        房间按你提供的照片分组定位；蓝点不代表拍摄站位或朝向。
      </p>
      <RoomNotebook roomId={roomId} />
      <Walkthrough roomName={room.name} roomStart={visit.videoStart} />
    </div>
  );
}
