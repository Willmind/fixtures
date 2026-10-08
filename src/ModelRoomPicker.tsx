import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";
import { rooms } from "./model/plan";
import { openDialogAtTitle } from "./dialogs/openDialog";

export function ModelRoomPicker({ focusedRoom, onChoose }: {
  focusedRoom: string | null;
  onChoose: (room: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const room = rooms.find((item) => item.id === focusedRoom);
  return <>
    <button type="button" className="room-picker-trigger" aria-haspopup="dialog"
      aria-expanded={open} onClick={() => setOpen(true)}>
      <Icon name="room" size={17} />
      <span>{room?.name ?? "选择空间"}</span>
      <Icon name="chevron" size={13} />
    </button>
    {open ? createPortal(<RoomPickerDialog focusedRoom={focusedRoom} onClose={() => setOpen(false)}
      onChoose={onChoose} />, document.body) : null}
  </>;
}

function RoomPickerDialog({ focusedRoom, onChoose, onClose }: {
  focusedRoom: string | null;
  onChoose: (room: string | null) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [closing, setClosing] = useState(false);
  const pendingRoom = useRef<string | null | undefined>(undefined);
  const finished = useRef(false);
  const finishClose = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    if (pendingRoom.current !== undefined) onChoose(pendingRoom.current);
    onClose();
  }, [onChoose, onClose]);
  function requestClose(room?: string | null) {
    if (closing) return;
    pendingRoom.current = room;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) finishClose();
    else setClosing(true);
  }
  useEffect(() => {
    if (!closing) return;
    // Still close if animations are interrupted by a theme/style change or a hidden tab.
    const timeout = window.setTimeout(finishClose, 350);
    return () => window.clearTimeout(timeout);
  }, [closing, finishClose]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement;
    openDialogAtTitle(dialog);
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} className={`room-picker-dialog${closing ? " is-closing" : ""}`} aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); requestClose(); }}
    onAnimationEnd={(event) => {
      if (event.target === event.currentTarget && event.animationName === "room-picker-out") finishClose();
    }}
    onClick={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
    <div className="room-picker-content" inert={closing}>
      <div className="dialog-heading">
        <h2 id={titleId} tabIndex={-1} data-dialog-title="">选择空间</h2>
        <button type="button" className="icon-button" aria-label="关闭空间列表" onClick={() => requestClose()}>
          <Icon name="close" size={18} />
        </button>
      </div>
      <p>看整屋布局，或进入一个房间查看内部。</p>
      <div className="room-picker-list">
        <button type="button" aria-pressed={!focusedRoom} onClick={() => requestClose(null)}>
          <Icon name="cube" size={18} /><span>整屋总览</span><Icon name="chevron" size={14} />
        </button>
        {rooms.map((room) => <button key={room.id} type="button" aria-pressed={focusedRoom === room.id}
          onClick={() => requestClose(room.id)}>
          <Icon name="room" size={18} /><span>{room.name}</span><Icon name="chevron" size={14} />
        </button>)}
      </div>
    </div>
  </dialog>;
}
