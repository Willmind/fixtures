import { roomIdentity } from "../house/rooms.ts";
import type { RoomId } from "../house/rooms.ts";

export type RoomGuide = {
  id: RoomId;
  name: string;
  original: string;
  point: [number, number];
  fact: string;
  idea: string;
  questions: string[];
  page: number;
};
// Hotspots on a crop of PDF page 1. Coordinates are image pixels, not dimensions.
export const roomGuides: RoomGuide[] = [
  {
    id: roomIdentity.living.id,
    name: roomIdentity.living.name,
    original: roomIdentity.living.originalName,
    point: [300, 270],
    page: 2,
    fact: "入户后经过玄关，餐厅和客厅连在一起。客厅朝向普通阳台，另一侧的过道通往三个房间。",
    idea: "客厅保留两种候选：电视 / 电视柜靠书房（原客房）、沙发靠次卧 A，或两边对调。可在毛坯三维中切换比较。",
    questions: [
      "两种电视、沙发朝向，哪种更适合一家人使用？",
      "餐桌平时坐 3 人，来客时需要坐几人？",
      "从入户门到各房间的通道会不会被柜子挡住？",
    ],
  },
  {
    id: roomIdentity.master.id,
    name: roomIdentity.master.name,
    original: roomIdentity.master.originalName,
    point: [651, 308],
    page: 2,
    fact: "位于图纸右侧，房间内连接一个独立卫生间。原家具图画了床和衣柜，但这不代表毛坯房已经有这些配置。",
    idea: "可以作为你和未来伴侣的卧室。也可以优先给爸妈，房间分配现在仍可讨论。",
    questions: [
      "谁更需要独立卫生间？",
      "两个人的衣物、行李箱需要放在哪里？",
      "床放好后，两侧和床尾走路是否方便？",
    ],
  },
  {
    id: roomIdentity.parents.id,
    name: roomIdentity.parents.name,
    original: roomIdentity.parents.originalName,
    point: [493, 330],
    page: 2,
    fact: "在客厅右侧、主卧左侧，与公用卫生间通过过道连接。原图的“女孩房”只是当时的设计名称。",
    idea: "这是爸妈房的一个候选。是否合适，要到现场比较采光、噪声和去卫生间的路线。",
    questions: [
      "爸妈夜里起床经过哪里，需要什么照明？",
      "床边需要给手机、台灯等留哪些插座？",
      "窗外噪声和下午日晒是否能接受？",
    ],
  },
  {
    id: roomIdentity.study.id,
    name: roomIdentity.study.name,
    original: roomIdentity.study.originalName,
    point: [510, 137],
    page: 2,
    fact: "位于图纸上侧、公卫和主卫之间。原家具图画的是卧室；目前没有改墙或确定新用途。",
    idea: "书房已安排在原客房，这里先保留卧室用途，模型中暂放一张 1.2 m 宽的床。",
    questions: [
      "这间卧室主要给谁住？",
      "床和衣柜放好后，通道是否足够？",
      "床头和日常使用位置需要哪些插座？",
    ],
  },
  {
    id: roomIdentity.guest.id,
    name: roomIdentity.guest.name,
    original: roomIdentity.guest.originalName,
    point: [156, 323],
    page: 2,
    fact: "靠近入户玄关，是一个独立房间。原图中的床只是布置参考，房间用途可重新安排。",
    idea: "按你的计划用作书房。模型里沿墙放一张浅胡桃色电脑桌和电脑，配深灰色人体工学椅，旁边放空的玻璃展示柜，后续用于收纳手办；具体尺寸和摆位仍可调整。",
    questions: [
      "电脑桌附近的插座和有线网络点位够用吗？",
      "展示柜的层高和深度能否放下收藏？",
      "桌前坐下、起身和走动的空间是否足够？",
    ],
  },
  {
    id: roomIdentity.kitchen.id,
    name: roomIdentity.kitchen.name,
    original: roomIdentity.kitchen.originalName,
    point: [178, 101],
    page: 2,
    fact: "在餐厅左侧，旁边是给水阳台。原平面图画有灶台、水槽和冰箱的位置，属于设计布置。",
    idea: "先和爸妈确认做饭习惯，再安排洗、切、炒的顺序以及常用小家电的位置。",
    questions: [
      "谁主要做饭，是否经常两个人一起操作？",
      "洗碗机、蒸烤箱等哪些确定要装？",
      "现场烟道、燃气表和上下水分别在哪里？",
    ],
  },
  {
    id: roomIdentity.bath.id,
    name: roomIdentity.bath.name,
    original: roomIdentity.bath.originalName,
    point: [418, 110],
    page: 2,
    fact: "从公共过道进入。PDF 第 1 页还有这个区域门洞调整的文字说明，需要与交付现场对照。",
    idea: "主要服务公共空间和次卧。先检查实际门洞、地漏和排水位置，再讨论洗澡、洗漱怎么安排。",
    questions: [
      "爸妈洗澡和夜间使用是否方便？",
      "现场门打开后会不会碰到其他东西？",
      "交付的管道、地漏、门洞与原图一致吗？",
    ],
  },
  {
    id: roomIdentity.ensuite.id,
    name: roomIdentity.ensuite.name,
    original: roomIdentity.ensuite.originalName,
    point: [619, 114],
    page: 2,
    fact: "位于主卧内部，和公卫是两个独立空间。原家具图画有洁具位置，不能据此认定现场管道准确位置。",
    idea: "结合主卧住谁，决定日常使用方式。先记录交付情况，再确定洁具尺寸。",
    questions: [
      "需要的洗漱和洗澡空间各有多大？",
      "通风、窗户和排水在现场是什么情况？",
      "有哪些日用品需要就近收纳？",
    ],
  },
  {
    id: roomIdentity.balcony.id,
    name: roomIdentity.balcony.name,
    original: roomIdentity.balcony.originalName,
    point: [310, 452],
    page: 1,
    fact: "连接客厅，原图名为普通阳台。你已确认上方有顶板；图纸中的坡度和高差仍属于设计信息。",
    idea: "保留原样与封窗都是候选，可在三维里独立切换。结合休闲、晾晒和养植物的需求比较，窗型与开启方式尚未确定。",
    questions: [
      "主要用来休闲还是晾晒？",
      "下雨时，现场排水和门口高差是什么情况？",
      "物业对阳台、空调外机和封窗有什么要求？",
    ],
  },
  {
    id: roomIdentity.utility.id,
    name: roomIdentity.utility.name,
    original: roomIdentity.utility.originalName,
    point: [303, 45],
    page: 2,
    fact: "在餐厅上侧、厨房旁边，上方有顶板。你已确认与厨房之间没有门。",
    idea: "洗衣机和热水器已确定放在靠厨房侧，旁边暂放扫地机器人和小型充电座，具体位置需结合干燥程度及机型要求确认。阳台可对比保持原样与封窗，不必与主阳台选择相同；设备和窗型仍待细化。",
    questions: [
      "靠厨房侧的净宽、插座、给排水接口能否满足选定设备？",
      "扫地机、拖把、清洁用品准备放哪里？",
      "上下水、电源和门窗开启是否互相影响？",
    ],
  },
];

export const sheets = [
  {
    page: 1,
    code: "P-00-D",
    title: "墙体开线图",
    simple: "墙体与门窗",
    detail:
      "先看房间之间怎么连通，再看门窗开口。黑色墙线本身不能用来判断哪些墙能拆。",
  },
  {
    page: 2,
    code: "P-01-D",
    title: "平面布置图",
    simple: "家具布置",
    detail:
      "用家具的位置帮助理解房间用途。你家是毛坯，图里的床、柜子和洁具是原方案参考。",
  },
  {
    page: 3,
    code: "P-02-D",
    title: "家具开线／索引图",
    simple: "家具尺寸与通道",
    detail:
      "数字标明原设计家具和间距。更换家具后，应重新核对空间，不能照搬原图下单。",
  },
  {
    page: 4,
    code: "P-03-D",
    title: "天花布置图",
    simple: "天花与吊顶",
    detail:
      "这是一张天花设计图，包含吊顶、材料和标高说明，不是当前毛坯天花的现场记录。",
  },
  {
    page: 5,
    code: "P-04-D",
    title: "灯具开线图",
    simple: "灯位与尺寸",
    detail:
      "引线旁的数字用于定位灯位。家具和用途改变后，灯位也应一起复核；这张图不表示开关回路。",
  },
  {
    page: 6,
    code: "P-05-D",
    title: "灯具指向图",
    simple: "灯具编号",
    detail:
      "可以与上一张灯位图对照。图中的字母编号需要配套图例才能确定完整规格，这份 PDF 没有提供完整灯具表。",
  },
  {
    page: 7,
    code: "P-06-D",
    title: "地面材质开线图",
    simple: "地面材料与铺贴",
    detail:
      "用不同填充和文字标示原设计材料与铺贴安排。它是旧方案，选材仍可根据你和爸妈的需求调整。",
  },
] as const;

export const glossary = [
  {
    mark: "4200",
    name: "尺寸数字",
    text: "这套图常用毫米标尺寸。4200 毫米就是 4.2 米。要沿着两端引线看它量的是哪一段，不能只看数字。",
    source: "P-00-D · 下方 N—S 轴线",
  },
  {
    mark: "N — S",
    name: "轴线",
    text: "像图纸的坐标路标，用字母或数字定位。轴线间距包含了它们之间的构造关系，不等于房间内部可用净宽。",
    source: "P-00-D · 下方字母圆圈",
  },
  {
    mark: "±0.000",
    name: "相对标高",
    text: "原设计用它作高度参照。旁边的 -0.050 表示相对低 50 毫米；它不是从地面到天花的房高，也不代表你家现场已经做成这样。",
    source: "P-00-D · 客厅与阳台标注",
  },
  {
    mark: "M / C",
    name: "门窗代号",
    text: "门、窗旁的字母和数字用来区分类型、对应明细。仅凭代号不要推算可购买的成品尺寸，仍要查明细并现场量。",
    source: "P-00-D / P-01-D · 开口旁标注",
  },
];

export const firstSteps = [
  {
    title: "记录现场情况",
    text: "拍摄各房间，测量尺寸，记录门窗、梁、管道和水电点位，标出与原图不同的位置。",
  },
  {
    title: "整理居住需求",
    text: "书房已安排在原客房，继续确认其余卧室分配、常用家电和收纳需求。",
  },
  {
    title: "确定布局和预算",
    text: "列出必需、可选和后续添置的项目，确定布局、预算范围和施工时间。",
  },
  {
    title: "核对施工方案",
    text: "按现场尺寸复核家具、设备和水电点位。涉及墙体、管道改动时，需专业核对并确认物业手续。",
  },
];
