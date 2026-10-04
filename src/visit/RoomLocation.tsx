import { roomGuides } from "../guide/content";

export function RoomLocation({
  roomId,
  onPlan,
}: {
  roomId: string;
  onPlan: () => void;
}) {
  const room = roomGuides.find((item) => item.id === roomId)!;
  return (
    <button
      className="visit-room-location"
      onClick={onPlan}
      aria-label={`在平面图中查看${room.name}`}
    >
      <span className="visit-mini-plan" aria-hidden="true">
        <img src="/house/d-plan.webp" alt="" width="1500" height="1000" />
        <span
          style={{
            left: `${room.point[0] / 7.5}%`,
            top: `${room.point[1] / 5}%`,
          }}
        />
      </span>
      <span>
        <strong>{room.name}的位置</strong>
        <small>蓝点表示房间 · 查看平面图 →</small>
      </span>
    </button>
  );
}
