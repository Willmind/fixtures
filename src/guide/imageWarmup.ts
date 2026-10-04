// Warm only images the user is about to open; never download the full album at once.
const pending = new Map<string, HTMLImageElement>();
export function warmImage(src: string) {
  if (pending.has(src)) return;
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection;
  if (connection?.saveData) return;
  const image = new Image();
  image.decoding = "async";
  image.fetchPriority = "low";
  image.onerror = () => pending.delete(src);
  pending.set(src, image);
  image.src = src;
  if (pending.size > 12) pending.delete(pending.keys().next().value!);
}
