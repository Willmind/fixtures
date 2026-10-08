import { useId, useState } from "react";
import { Icon } from "./icons";
import type { Room } from "./model/plan";
import { photosForRoom } from "./visit/content";

type Props = {
  room: Room;
  summary?: string;
  onVisit: (id: string) => void;
  onClose: () => void;
  onFocus: () => void;
  focused: boolean;
};

/** A compact mobile summary; the full description stays visible on desktop. */
export function ModelRoomDetails({ room, summary, onVisit, onClose, onFocus, focused }: Props) {
  const [expanded, setExpanded] = useState(false);
  const descriptionId = useId();
  return (
    <div className={`room-detail${expanded ? " is-expanded" : ""}`} aria-live="polite">
      <div className="room-detail-icon"><Icon name="room" size={23} /></div>
      <div className="room-detail-main">
        <div className="room-detail-heading">
          <div>
            <span className="detail-eyebrow">{focused ? "房间视角" : "已选择空间"}</span>
            <h2>{room.name}</h2>
          </div>
          <button type="button" className="room-detail-toggle" aria-expanded={expanded}
            aria-controls={descriptionId} aria-label={`${expanded ? "收起" : "展开"}${room.name}介绍`}
            onClick={() => setExpanded((value) => !value)}>
            详情 <Icon name="chevron" size={13} />
          </button>
        </div>
        <div id={descriptionId} className="room-detail-description">
          <p>{room.description}</p>
          {summary ? <p className="room-option-summary">当前预览：{summary}</p> : null}
        </div>
        <div className="room-detail-actions">
        {!focused ? <button type="button" className="model-visit-link room-focus-link" onClick={onFocus}>
          查看房间 <Icon name="chevron" size={14} />
        </button> : null}
        <button type="button" className="model-visit-link" onClick={() => onVisit(room.id)}
          aria-label={`查看${room.name}现场照片`}>
          <span className="model-visit-desktop">查看现场 · {photosForRoom(room.id).length} 张照片</span>
          <span className="model-visit-mobile">实拍</span>
          <Icon name="chevron" size={14} />
        </button>
        </div>
      </div>
      <button type="button" className="icon-button" aria-label={focused ? "返回整屋总览" : "取消房间选择"} onClick={onClose}>
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
