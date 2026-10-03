import photos from "./photos.json" with { type: "json" };

export type SitePhoto = (typeof photos)[number];
export const sitePhotos: SitePhoto[] = photos;
export const photoUrl = (photo: SitePhoto, thumbnail = false) =>
  `/site-visit/${thumbnail ? "thumbs/" : ""}${photo.id}.webp`;
export const photosForRoom = (roomId: string) =>
  sitePhotos.filter((photo) => photo.roomId === roomId);

export type RoomVisit = {
  roomId: string;
  observed: string[];
  measure: string[];
  videoStart?: number;
};
export const roomVisits: RoomVisit[] = [
  {
    roomId: "living",
    observed: [
      "客厅、餐厅和过道相连，照片分别记录了两个方向的阳台门。",
      "室内墙面呈白色，地面仍是未铺装状态；能看到部分外露管线。",
      "入户门附近已有门框，门口照片可用来对照入户方向。",
    ],
    measure: [
      "客厅和餐厅各自的净长、净宽，以及过道最窄处。",
      "两处阳台门洞的净宽、净高和门槛高差。",
      "配电箱、开关插座和外露管线的实际用途与位置。",
    ],
    videoStart: 6,
  },
  {
    roomId: "master",
    observed: [
      "主卧外侧窗下有明显的台面，窗框为深色。",
      "主卧内侧还有一段通向主卫附近的狭长空间，尽头另有窗户。",
      "卧室墙面呈白色，地面尚未铺装。",
    ],
    measure: [
      "床位区域的净长、净宽，以及内侧过道宽度。",
      "窗台的高度、进深和窗洞尺寸。",
      "主卫门洞与墙角的距离。",
    ],
  },
  {
    roomId: "parents",
    observed: [
      "次卧 A 窗下有较宽的台面，窗边存在墙体凹位。",
      "从门口能看到完整窗面，地面尚未铺装。",
      "这个名称沿用你的照片分组，是否作为父母房还未确定。",
    ],
    measure: [
      "房间净长、净宽和门洞位置。",
      "窗台高度、进深及窗边两侧墙垛宽度。",
      "放床后两侧通道与柜门开启所需空间。",
    ],
  },
  {
    roomId: "study",
    observed: [
      "次卧 B 的窗洞较宽，窗框分格与次卧 A 不同。",
      "窗边有内凹墙面，地面尚未铺装。",
      "可以继续作为书房候选，照片本身不决定最终用途。",
    ],
    measure: [
      "窗下墙面的可用宽度及窗台高度。",
      "书桌候选位置附近的插座与网络点位。",
      "净长、净宽和门扇开启后的占用范围。",
    ],
  },
  {
    roomId: "guest",
    observed: [
      "客房靠近入户区域，照片记录了门口和朝窗户的两个视角。",
      "窗下是墙面，外观与主卧的宽窗台不同。",
      "房间地面尚未铺装，墙面呈白色。",
    ],
    measure: [
      "净长、净宽，以及门洞到两侧墙角的距离。",
      "窗台高度、窗洞宽度和家具可用墙面。",
    ],
  },
  {
    roomId: "kitchen",
    observed: [
      "厨房保留灰色裸露墙面，尚未安装橱柜。",
      "地面可见外露管线，墙角可见竖向槽位。",
      "窗户和窗下墙面已在照片中记录。",
    ],
    measure: [
      "各段墙面的净长、窗台高度和窗洞位置。",
      "竖向槽位、烟道及管线分别是什么，以现场资料核对。",
      "给排水、燃气和电源点位的位置与高度。",
    ],
    videoStart: 11,
  },
  {
    roomId: "bath",
    observed: [
      "公卫呈狭长形，照片从入口朝窗户拍摄。",
      "墙面和地面仍是裸露状态，可见预留点位与管线。",
      "照片不足以确认排水坡度、防水层或管线用途。",
    ],
    measure: [
      "净长、净宽、窗台高度与门洞宽度。",
      "各排水口中心到墙面的距离，以及地面高差。",
      "竖向管道和检修所需空间。",
    ],
    videoStart: 15,
  },
  {
    roomId: "ensuite",
    observed: [
      "主卫保留裸露墙面，窗下有台面。",
      "照片能看到靠墙的预留点位和地面外露管线。",
      "目前只有一个拍摄方向，门口另一侧还需补充。",
    ],
    measure: [
      "净长、净宽和门窗洞位置。",
      "排水口中心距墙尺寸、窗台高度及地面高差。",
      "补拍门口、另一侧墙面和顶部管道。",
    ],
  },
  {
    roomId: "balcony",
    observed: [
      "主阳台有深色金属框架和玻璃栏板。",
      "照片记录了栏杆转角以及朝外视野。",
      "地面仍未铺装，照片不能证明日照时长或准确朝向。",
    ],
    measure: [
      "阳台净宽、净深、栏杆高度与门槛高差。",
      "排水口、顶部和两侧墙面的实际位置。",
    ],
    videoStart: 37,
  },
  {
    roomId: "utility",
    observed: [
      "生活阳台有玻璃栏板，靠墙能看到设备和外露管道。",
      "与室内相邻的窗户、门边和栏杆关系已拍到。",
      "设备名称、管道用途与可移动范围尚未逐项核对。",
    ],
    measure: [
      "阳台净宽、净深和进出通道宽度。",
      "设备、管道、地漏和给排水接口的位置。",
      "洗烘设备候选位置的净空与检修空间。",
    ],
  },
];

export const videoChapters = [
  { at: 0, label: "入户" },
  { at: 6, label: "公共空间" },
  { at: 11, label: "厨房门口" },
  { at: 15, label: "卫生间门口" },
  { at: 18, label: "卧室区域" },
  { at: 34, label: "客厅与阳台" },
];
