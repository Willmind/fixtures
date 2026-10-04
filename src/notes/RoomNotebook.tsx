import { useEffect, useRef, useState } from "react";
import { roomGuides } from "../guide/content";
import {
  emptyRecord,
  hasRecord,
  MAX_IMPORT_BYTES,
  parseNotebook,
  tasksForRoom,
  type Notebook,
} from "./records";
import { useNotebook } from "./NotebookContext";
import { Icon } from "../icons";
import "./notes.css";

function download(data: Notebook) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `我的家-准备记录-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function RoomNotebook({ roomId }: { roomId: string }) {
  const { data, error, update, importRecords, openRooms, setRoomOpen } =
    useNotebook();
  const record = data.rooms[roomId] ?? emptyRecord();
  const room = roomGuides.find((item) => item.id === roomId)!;
  const tasks = tasksForRoom(roomId);
  const completed = tasks.filter((task) => record.done[task.id]).length;
  const file = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<Notebook | null>(null);
  async function readFile(selected?: File) {
    if (!selected) return;
    const id = ++generation.current;
    setMessage("");
    try {
      if (selected.size > MAX_IMPORT_BYTES)
        throw new Error("文件太大，请选择本站导出的 JSON 备份。");
      const incoming = parseNotebook(await selected.text());
      if (id !== generation.current) return;
      if (!Object.values(incoming.rooms).some(hasRecord))
        throw new Error("这份备份还没有填写任何记录。");
      setPreview(incoming);
    } catch (cause) {
      if (id === generation.current)
        setMessage(
          cause instanceof Error ? cause.message : "无法读取这份备份。",
        );
    }
  }
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );
  return (
    <details
      open={openRooms.has(roomId)}
      onToggle={(event) => setRoomOpen(roomId, event.currentTarget.open)}
      id="room-notebook"
      className="room-notebook"
      tabIndex={-1}
      aria-labelledby="notebook-title"
    >
      <summary className="notebook-heading">
        <div>
          <p className="guide-kicker">房间准备</p>
          <h2 id="notebook-title">{room.name} · 记录与待办</h2>
          <p>先定用途，再量尺寸，把商量好的事记下来。</p>
        </div>
        <span className="notebook-progress">
          {completed} / {tasks.length} 项已确认
        </span>
      </summary>
      <div className="notebook-storage">
        <div>
          <strong role="status">
            {error ? "尚未保存到本机" : "修改自动保存在本机"}
          </strong>
          <p>
            仅当前设备、浏览器和网址，手机与电脑不会自动同步；本地预览与线上网站也独立。清理数据或换设备前请导出备份。
          </p>
        </div>
        <div className="notebook-backup-actions">
          <button
            onClick={() => {
              download(data);
              setMessage("备份下载已发起，请确认文件已保存。");
            }}
          >
            导出备份
          </button>
          <button onClick={() => file.current?.click()}>导入备份</button>
          <input
            ref={file}
            hidden
            type="file"
            accept=".json,application/json"
            aria-label="选择准备记录备份"
            onChange={(event) => {
              void readFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
      </div>
      {error ? (
        <p className="notebook-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="notebook-message" role="status">
          {message}
        </p>
      ) : null}
      <div className="notebook-columns">
        <div className="notebook-fields">
          <label>
            房间用途
            <input
              maxLength={100}
              value={record.purpose}
              placeholder="例如：爸妈房、书房，未定可留空"
              onChange={(event) =>
                update(roomId, { purpose: event.target.value })
              }
            />
          </label>
          <fieldset>
            <legend>现场尺寸 · 毫米</legend>
            <p>填实际测量值；不规则区域、梁和门窗尺寸记在下方备注。</p>
            <div className="notebook-dimensions">
              {(
                [
                  ["length", "净长"],
                  ["width", "净宽"],
                  ["height", "层高"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    inputMode="decimal"
                    maxLength={50}
                    placeholder="未测"
                    value={record[key]}
                    onChange={(event) =>
                      update(roomId, { [key]: event.target.value })
                    }
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <label>
            商量结果和测量备注
            <textarea
              rows={5}
              maxLength={4000}
              value={record.notes}
              placeholder="例如：书桌靠哪面墙、要买什么设备、还有哪些尺寸要补测。"
              onChange={(event) =>
                update(roomId, { notes: event.target.value })
              }
            />
          </label>
          <p className="notebook-footnote">
            记录不会自动改动三维尺寸或原图。勾选表示你已确认这一项。
          </p>
        </div>
        <div className="notebook-tasks">
          {(
            [
              ["decide", "和家人商量"],
              ["measure", "到现场测量"],
            ] as const
          ).map(([kind, title]) => (
            <fieldset key={kind}>
              <legend>{title}</legend>
              {tasks
                .filter((task) => task.kind === kind)
                .map((task) => (
                  <label
                    className={record.done[task.id] ? "is-done" : ""}
                    key={task.id}
                  >
                    <input
                      type="checkbox"
                      checked={!!record.done[task.id]}
                      onChange={(event) =>
                        update(roomId, {
                          done: { [task.id]: event.target.checked },
                        })
                      }
                    />
                    <span>{task.text}</span>
                  </label>
                ))}
            </fieldset>
          ))}
        </div>
      </div>
      {preview ? (
        <ImportDialog
          preview={preview}
          local={data}
          onClose={() => setPreview(null)}
          onImport={(replace) => {
            download(data);
            importRecords(preview, replace);
            setPreview(null);
            setMessage("已导入；导入前的本机记录也已发起备份下载。");
          }}
        />
      ) : null}
    </details>
  );
}
function ImportDialog({
  preview,
  local,
  onClose,
  onImport,
}: {
  preview: Notebook;
  local: Notebook;
  onClose: () => void;
  onImport: (replace: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [replace, setReplace] = useState(false);
  const incoming = roomGuides.filter((room) =>
    hasRecord(preview.rooms[room.id]),
  );
  const conflicts = incoming.filter((room) => hasRecord(local.rooms[room.id]));
  useEffect(() => {
    const opener = document.activeElement;
    const element = dialog.current!;
    element.showModal();
    return () => {
      element.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="notebook-import"
      aria-labelledby="import-title"
      onCancel={onClose}
    >
      <header>
        <h2 id="import-title">确认导入准备记录</h2>
        <button onClick={onClose} aria-label="关闭导入预览">
          <Icon name="close" />
        </button>
      </header>
      <p>备份包含 {incoming.length} 个房间。确认后会先下载一份当前记录备份。</p>
      <ul>
        {incoming.map((room) => (
          <li key={room.id}>
            <strong>{room.name}</strong>
            <span>{preview.rooms[room.id].purpose || "用途未填"}</span>
            {hasRecord(local.rooms[room.id]) ? (
              <small>本机已有记录</small>
            ) : null}
          </li>
        ))}
      </ul>
      {conflicts.length ? (
        <fieldset>
          <legend>{conflicts.length} 个房间有重复记录</legend>
          <label>
            <input
              type="radio"
              name="conflict"
              checked={!replace}
              onChange={() => setReplace(false)}
            />
            保留本机记录，只补充其他房间
          </label>
          <label>
            <input
              type="radio"
              name="conflict"
              checked={replace}
              onChange={() => setReplace(true)}
            />
            这些房间采用备份中的记录
          </label>
        </fieldset>
      ) : null}
      <footer>
        <button onClick={onClose}>取消</button>
        <button className="notebook-primary" onClick={() => onImport(replace)}>
          确认导入
        </button>
      </footer>
    </dialog>
  );
}
