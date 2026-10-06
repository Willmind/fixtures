/**
 * PDF 第 1、2 页的人工几何重建，单位为米。
 * x 从图纸左向右，z 从上向下（不是地理北向）。y 为竖直高度。
 * 轴线依据：K–N 2.6，N–S 4.2，S–U 3.4，U–V 3.4；13–18 7.45。
 * 局部位置由扫描图估读；门窗高度、墙厚、墙高为可替换假设。
 * 本文件不判断承重性质，不表示竣工或现场实测现状。
 */
export type Point = readonly [number, number];
export type Room = {
  id: string;
  name: string;
  originalName?: string;
  kind: "living" | "bedroom" | "kitchen" | "bathroom" | "balcony";
  polygon: readonly Point[];
  label: Point;
  description: string;
};
export type Opening = {
  kind: "door" | "window";
  start: number;
  end: number;
  sill: number;
  top: number;
};
export type Wall = {
  id: string;
  from: Point;
  to: Point;
  thickness?: number;
  height?: number;
  openings?: Opening[];
};

export const defaults = {
  wallHeight: 2.8,
  wallThickness: 0.2,
  cutHeight: 1.05,
};
export const modelCenter: Point = [6.8, 4.6];
export const rect = (x: number, z: number, w: number, d: number): Point[] => [
  [x, z],
  [x + w, z],
  [x + w, z + d],
  [x, z + d],
];

export const rooms: Room[] = [
  {
    id: "living",
    name: "客餐厅",
    kind: "living",
    label: [4.65, 6.2],
    polygon: [
      [0, 3.7],
      [2.6, 3.7],
      [2.6, 1.2],
      [5.8, 1.2],
      [5.8, 4.25],
      [10.2, 4.25],
      [10.2, 5.15],
      [6.8, 5.15],
      [6.8, 8.65],
      [2.6, 8.65],
      [2.6, 5.15],
      [0, 5.15],
    ],
    description: "前侧连接主阳台。客厅保留两种电视、沙发相对摆法，餐厅暂放一张四人餐桌和四把椅子。",
  },
  {
    id: "master",
    name: "主卧",
    originalName: "主人房",
    kind: "bedroom",
    label: [11.8, 6.45],
    polygon: [
      [12, 1.2],
      [13.6, 1.2],
      [13.6, 8.65],
      [10.2, 8.65],
      [10.2, 4.25],
      [12, 4.25],
    ],
    description: "保留原图右侧的主卧套间布局，内侧连接独立卫生间。暂放一张 1.8 m 宽的床，位置与尺寸可再调整。",
  },
  {
    id: "parents",
    name: "次卧 A",
    originalName: "女孩房",
    kind: "bedroom",
    polygon: rect(6.8, 5.15, 3.4, 3.5),
    label: [8.5, 6.9],
    description: "原图标注「女孩房」。暂放一张 1.5 m 宽的床，使用用途与最终摆放尚未确定。",
  },
  {
    id: "study",
    name: "次卧 B",
    originalName: "男孩房",
    kind: "bedroom",
    polygon: rect(7.6, 1.2, 2.6, 3.05),
    label: [8.9, 2.8],
    description: "原图标注「男孩房」。暂放一张 1.2 m 宽的床，仍保留作为书房的候选，模型未修改墙体。",
  },
  {
    id: "guest",
    name: "客房",
    kind: "bedroom",
    polygon: rect(0, 5.15, 2.6, 3.5),
    label: [1.3, 6.9],
    description: "位于入户附近的独立房间。保留原图的门洞与前侧窗洞。",
  },
  {
    id: "kitchen",
    name: "厨房",
    kind: "kitchen",
    polygon: rect(0.6, 0, 2, 3.7),
    label: [1.6, 1.9],
    description: "厨房从餐厅一侧进入，与生活阳台之间无门。沿墙暂摆橱柜、燃气灶、抽油烟机、水槽和水龙头；尺寸与水电、烟道点位待复测。",
  },
  {
    id: "bath",
    name: "公卫",
    kind: "bathroom",
    polygon: rect(5.8, 1.2, 1.8, 3.05),
    label: [6.7, 2.8],
    description: "由公共过道进入，暂放马桶、洗手池、镜子和花洒。摆放仅为示意，给排水点位待现场核实。",
  },
  {
    id: "ensuite",
    name: "主卫",
    kind: "bathroom",
    polygon: rect(10.2, 1.2, 1.8, 3.05),
    label: [11.1, 2.8],
    description: "主卧内的独立卫生间，暂放马桶、洗手池、镜子和花洒；给排水点位待核实，未加入淋浴隔断。",
  },
  {
    id: "balcony",
    name: "主阳台",
    originalName: "普通阳台",
    kind: "balcony",
    polygon: rect(2.6, 8.65, 4.2, 1.2),
    label: [4.7, 9.25],
    description: "连接客厅，上方有顶板。可独立对比保持原样与封窗；封窗的窗型、分格和开启方式尚未确定。",
  },
  {
    id: "utility",
    name: "生活阳台",
    originalName: "给水阳台",
    kind: "balcony",
    polygon: rect(2.6, 0, 3.2, 1.2),
    label: [4.2, 0.6],
    description: "上方有顶板，模型按与客餐厅敞开连接的方案展示。外侧可独立对比保持原样与落地玻璃封窗。洗衣机、热水器靠厨房侧，与厨房之间无门；设备安装仍为示意。",
  },
];

const door = (start: number, width = 0.85): Opening => ({
  kind: "door",
  start,
  end: start + width,
  sill: 0,
  top: 2.2,
});
const windowOpening = (start: number, width: number, sill = 0.9): Opening => ({
  kind: "window",
  start,
  end: start + width,
  sill,
  top: 2.2,
});

export const walls: Wall[] = [
  { id: "kitchen-west", from: [0.6, 0], to: [0.6, 3.7] },
  {
    id: "kitchen-north",
    from: [0.6, 0],
    to: [2.6, 0],
    openings: [windowOpening(0.55, 0.9)],
  },
  { id: "kitchen-south", from: [0.6, 3.7], to: [2.6, 3.7] },
  {
    id: "kitchen-east",
    from: [2.6, 0],
    to: [2.6, 3.7],
    // Owner confirmed no door between kitchen and utility balcony.
    openings: [door(1.75, 1.2)],
  },
  { id: "entry-recess", from: [0, 3.7], to: [0.6, 3.7] },
  { id: "entry", from: [0, 3.7], to: [0, 5.15], openings: [door(0.13, 1.15)] },
  { id: "guest-west", from: [0, 5.15], to: [0, 8.65] },
  {
    id: "guest-north",
    from: [0, 5.15],
    to: [2.6, 5.15],
    openings: [door(1.6, 0.85)],
  },
  { id: "guest-east", from: [2.6, 5.15], to: [2.6, 8.65] },
  {
    id: "guest-south",
    from: [0, 8.65],
    to: [2.6, 8.65],
    openings: [windowOpening(0.38, 1.85)],
  },
  {
    id: "living-south",
    from: [2.6, 8.65],
    to: [6.8, 8.65],
    openings: [door(0.6, 2.8)],
  },
  // Owner-requested open connection between the utility balcony and dining
  // area: omit the entire divider, including its glazing and side wall pieces.
  { id: "bath-west", from: [5.8, 1.2], to: [5.8, 4.25] },
  { id: "bath-east", from: [7.6, 1.2], to: [7.6, 4.25] },
  {
    id: "bath-south",
    from: [5.8, 4.25],
    to: [7.6, 4.25],
    openings: [door(0.6, 0.8)],
  },
  {
    id: "study-south",
    from: [7.6, 4.25],
    to: [10.2, 4.25],
    openings: [door(1.6, 0.85)],
  },
  { id: "study-east", from: [10.2, 1.2], to: [10.2, 4.25] },
  {
    id: "master-entry",
    from: [10.2, 4.25],
    to: [10.2, 5.15],
    openings: [door(0.025, 0.85)],
  },
  { id: "bedrooms-divider", from: [10.2, 5.15], to: [10.2, 8.65] },
  { id: "bedroom-a-west", from: [6.8, 5.15], to: [6.8, 8.65] },
  {
    id: "bedroom-a-north",
    from: [6.8, 5.15],
    to: [10.2, 5.15],
    openings: [door(0.3, 0.85)],
  },
  { id: "ensuite-east", from: [12, 1.2], to: [12, 4.25] },
  {
    id: "ensuite-south",
    from: [10.2, 4.25],
    to: [12, 4.25],
    openings: [door(0.82, 0.8)],
  },
  { id: "master-east", from: [13.6, 1.2], to: [13.6, 8.65], thickness: 0.24 },
  {
    id: "bedroom-a-south",
    from: [6.8, 8.65],
    to: [10.2, 8.65],
    openings: [windowOpening(0.8, 1.8, 0.55)],
  },
  {
    id: "master-south",
    from: [10.2, 8.65],
    to: [13.6, 8.65],
    openings: [windowOpening(0.8, 1.8, 0.55)],
  },
  {
    id: "bath-north",
    from: [5.8, 1.2],
    to: [7.6, 1.2],
    openings: [windowOpening(0.55, 0.6, 1.3)],
  },
  {
    id: "study-north",
    from: [7.6, 1.2],
    to: [10.2, 1.2],
    openings: [windowOpening(0.4, 1.8)],
  },
  {
    id: "ensuite-north",
    from: [10.2, 1.2],
    to: [12, 1.2],
    openings: [windowOpening(0.58, 0.6, 1.3)],
  },
  {
    id: "master-north",
    from: [12, 1.2],
    to: [13.6, 1.2],
    openings: [windowOpening(0.3, 1)],
  },
];

export const railings: { roomId: "balcony" | "utility"; from: Point; to: Point }[] = [
  { roomId: "balcony", from: [2.6, 8.65], to: [2.6, 9.85] },
  { roomId: "balcony", from: [2.6, 9.85], to: [6.8, 9.85] },
  { roomId: "balcony", from: [6.8, 9.85], to: [6.8, 8.65] },
  { roomId: "utility", from: [2.6, 0], to: [5.8, 0] },
  { roomId: "utility", from: [5.8, 0], to: [5.8, 1.2] },
];

export const dimensionLines = [
  { from: [0, 10.5] as Point, to: [2.6, 10.5] as Point, label: "2.60 m" },
  { from: [2.6, 10.5] as Point, to: [6.8, 10.5] as Point, label: "4.20 m" },
  { from: [6.8, 10.5] as Point, to: [10.2, 10.5] as Point, label: "3.40 m" },
  { from: [10.2, 10.5] as Point, to: [13.6, 10.5] as Point, label: "3.40 m" },
];
