import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  emptyNotebook,
  emptyRecord,
  mergeNotebook,
  readNotebook,
  writeNotebook,
  STORAGE_KEY,
  type Notebook,
  type RoomRecord,
} from "./records";

type NotebookContextValue = {
  data: Notebook;
  openRooms: Set<string>;
  setRoomOpen: (room: string, open: boolean) => void;
  error: string;
  update: (room: string, patch: Partial<RoomRecord>) => void;
  importRecords: (data: Notebook, replace: boolean) => void;
};
const Context = createContext<NotebookContextValue | null>(null);
function initial() {
  try {
    return readNotebook(localStorage);
  } catch {
    return {
      data: emptyNotebook(),
      error: "浏览器不允许本机保存。本次填写可用“导出备份”保存。",
    };
  }
}
export function NotebookProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initial);
  const [openRooms, setOpenRooms] = useState(new Set<string>());
  const current = useRef(state);
  function commit(data: Notebook) {
    let saved = false;
    // A failed read must not erase a possibly recoverable existing record.
    if (!current.current.error) {
      try {
        saved = writeNotebook(localStorage, data);
      } catch {
        /* Browser storage disabled. */
      }
    }
    const next = {
      data,
      error: saved
        ? ""
        : current.current.error ||
          "本机保存失败，本次修改仅留在当前页面，请导出备份后再关闭。",
    };
    current.current = next;
    setState(next);
  }
  function update(room: string, patch: Partial<RoomRecord>) {
    const data = current.current.data;
    const previous = data.rooms[room] ?? emptyRecord();
    commit({
      ...data,
      rooms: {
        ...data.rooms,
        [room]: {
          ...previous,
          ...patch,
          done: { ...previous.done, ...patch.done },
          updatedAt: new Date().toISOString(),
        },
      },
    });
  }
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || current.current.error) return;
      const next = initial();
      current.current = next;
      setState(next);
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  return (
    <Context.Provider
      value={{
        ...state,
        openRooms,
        setRoomOpen: (room, open) =>
          setOpenRooms((previous) => {
            if (previous.has(room) === open) return previous;
            const next = new Set(previous);
            if (open) next.add(room);
            else next.delete(room);
            return next;
          }),
        update,
        importRecords: (data, replace) =>
          commit(mergeNotebook(current.current.data, data, replace)),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useNotebook() {
  const context = useContext(Context);
  if (!context) throw new Error("NotebookProvider is required");
  return context;
}
