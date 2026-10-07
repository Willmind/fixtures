import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { rooms } from "../src/model/plan.ts";
import { readRoute, routeUrl } from "../src/navigation.ts";
import {
  sitePhotos,
  roomVisits,
  photoUrl,
  photosForRoom,
  videoChapters,
} from "../src/visit/content.ts";

const asset = (path) => new URL(`../public${path}`, import.meta.url);

test("房间相册索引保持稳定，更新记录时不重新安排照片预加载", () => {
  const combined = [];
  for (const room of rooms) {
    const photos = photosForRoom(room.id);
    assert.strictEqual(photosForRoom(room.id), photos);
    assert.ok(photos.every((photo) => photo.roomId === room.id));
    combined.push(...photos);
  }
  assert.deepEqual(new Set(combined), new Set(sitePhotos));
  assert.equal(photosForRoom("missing").length, 0);
});

test("现场资料覆盖全部房间，照片和缩略图均可发布", () => {
  const ids = new Set(rooms.map((room) => room.id));
  assert.deepEqual(new Set(roomVisits.map((room) => room.roomId)), ids);
  assert.equal(roomVisits.length, ids.size);
  assert.deepEqual(new Set(sitePhotos.map((photo) => photo.roomId)), ids);
  assert.equal(
    new Set(sitePhotos.map((photo) => photo.id)).size,
    sitePhotos.length,
  );
  assert.equal(sitePhotos.length, 24);
  let total = 0;
  for (const photo of sitePhotos) {
    assert.ok(
      photo.width > 0 &&
        photo.height > 0 &&
        Math.max(photo.width, photo.height) <= 1800,
    );
    assert.ok(photo.caption && /\.heic$/i.test(photo.source));
    for (const thumbnail of [false, true]) {
      const file = readFileSync(asset(photoUrl(photo, thumbnail)));
      assert.equal(file.toString("ascii", 0, 4), "RIFF");
      assert.equal(file.toString("ascii", 8, 12), "WEBP");
      assert.ok(file.length < (thumbnail ? 100_000 : 600_000), photo.id);
      total += file.length;
    }
  }
  assert.ok(total < 5_000_000, "整组照片与缩略图不超过 5 MB");
  for (const room of roomVisits) {
    assert.ok(room.observed.length > 0 && room.measure.length > 0);
    if (room.videoStart !== undefined)
      assert.ok(room.videoStart >= 0 && room.videoStart < 43.4);
  }
});

test("视频采用可渐进播放的 MP4，章节不超出视频范围", () => {
  const data = readFileSync(asset("/site-visit/walkthrough.mp4"));
  assert.ok(data.length < 10_000_000);
  const atoms = [];
  for (let offset = 0; offset + 8 <= data.length;) {
    const length = data.readUInt32BE(offset);
    assert.ok(length >= 8 && offset + length <= data.length, "合法 MP4 atom");
    atoms.push(data.toString("ascii", offset + 4, offset + 8));
    offset += length;
  }
  assert.equal(atoms[0], "ftyp");
  assert.ok(
    atoms.includes("moov") && atoms.indexOf("moov") < atoms.indexOf("mdat"),
  );
  assert.ok(statSync(asset("/site-visit/video-poster.webp")).size < 100_000);
  assert.ok(
    videoChapters.every(
      (chapter, index) =>
        chapter.at >= 0 &&
        chapter.at < 43.4 &&
        (index === 0 || chapter.at > videoChapters[index - 1].at),
    ),
  );
});

test("平面、实拍和三维链接保留房间，刷新与返回可恢复", () => {
  assert.deepEqual(readRoute(""), { view: "model", tab: "rooms", room: null });
  const initial = readRoute("?tab=visit&room=master");
  assert.deepEqual(initial, { view: "guide", tab: "visit", room: "master" });
  for (const view of ["guide", "model", "cad"]) {
    const route = { ...initial, view };
    const url = routeUrl("https://home.willmindgg.cn/?local=1", route);
    assert.deepEqual(readRoute(url.search), route);
    assert.equal(url.searchParams.has("local"), false);
  }
  const reset = routeUrl(
    "https://home.willmindgg.cn/?view=model&tab=visit&room=master",
    { view: "guide", tab: "rooms", room: null },
  );
  assert.equal(reset.search, "?view=guide");
  assert.deepEqual(readRoute(reset.search), { view: "guide", tab: "rooms", room: null });
  for (const view of ["guide", "model", "cad"]) {
    const route = { view, tab: "rooms", room: null };
    assert.deepEqual(readRoute(routeUrl(reset.href, route).search), route);
  }
  for (const tab of ["rooms", "visit", "reading", "sources"]) {
    assert.equal(readRoute(`?tab=${tab}`).view, "guide");
  }
});

test("无效导航参数回退，不引用不存在的房间资料", () => {
  assert.deepEqual(readRoute("?view=unknown&tab=unknown&room=missing"), {
    view: "model",
    tab: "rooms",
    room: null,
  });
  for (const room of rooms)
    assert.equal(readRoute(`?tab=visit&room=${room.id}`).room, room.id);
});
