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
    description: "前侧连接主阳台。客厅保留两种电视、沙发相对摆法，沙发前放一张低矮茶几，家具统一浅胡桃色系；面对电视时，左侧是边柜，右侧是盆栽。餐厅暂放一张四人餐桌和四把椅子。",
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
    description: "保留原图右侧的主卧套间布局，内侧连接独立卫生间。1.8 m 收纳床的床头靠西侧实墙，两侧保留通道；床头柜旁使用固定床底段，抽屉从柜子前方拉出。尺寸按示意模型预留，待现场复测。",
  },
  {
    id: "parents",
    name: "次卧 A",
    originalName: "女孩房",
    kind: "bedroom",
    polygon: rect(6.8, 5.15, 3.4, 3.5),
    label: [8.5, 6.9],
    description: "原图标注「女孩房」，当前按父母房预览。1.5 m 收纳床的床头靠东侧实墙，两侧保留通道；西侧衣柜采用 0.42 m 深的浅柜示意，需侧向挂衣，床尾至柜前约留 0.60 m。最终柜型与净尺寸待复测。",
  },
  {
    id: "study",
    name: "次卧 B",
    originalName: "男孩房",
    kind: "bedroom",
    polygon: rect(7.6, 1.2, 2.6, 3.05),
    label: [8.9, 2.8],
    description: "原图标注「男孩房」。1.2 m 单人收纳床的床头靠西侧实墙，一侧贴近北侧窗边，南侧留通道，抽屉只朝南侧拉出；衣柜放在南墙旁并避开门扇。书房安排在原客房，模型未修改墙体。",
  },
  {
    id: "guest",
    name: "书房",
    originalName: "客房",
    kind: "bedroom",
    polygon: rect(0, 5.15, 2.6, 3.5),
    label: [1.3, 6.9],
    description: "原客房按你的计划用作书房，靠墙摆放电脑桌和电脑，配深灰色人体工学椅，旁边是空的手办展示柜，两扇玻璃柜门可分别点击开合，默认关闭。保留原图门窗，桌柜采用浅胡桃木色。",
  },
  {
    id: "kitchen",
    name: "厨房",
    kind: "kitchen",
    polygon: rect(0.6, 0, 2, 3.7),
    label: [1.6, 1.9],
    description: "厨房从餐厅一侧进入，与生活阳台之间无门。沿墙暂摆橱柜、可点击炉头或旋钮独立开关火的双头燃气灶、抽油烟机、水槽和可点击开关水的水龙头，窗户上方的排气扇可点击启动或停止，入口旁的墙角放冰箱，上下两扇门可分别点击开合；地面加 1% 找坡与候选地漏，位置及可接入的排水接口需复测。",
  },
  {
    id: "bath",
    name: "公卫",
    kind: "bathroom",
    polygon: rect(5.8, 1.2, 1.8, 3.05),
    label: [6.7, 2.8],
    description: "由公共过道进入，左墙旁依次为悬浮洗手台与镜子、白色蹲厕，镜子无框，水龙头可点击开关水，柜底离地约 0.30 m，玻璃门后是最里面的淋浴区。湿区按 1.5% 找向左上角地漏，隔断外干区按 1% 找向候选地漏；可在显示设置中开启排水坡向。窗户上方有排气扇，可点击启动或停止。按期望布局预览，尺寸和给排水点位待现场核实。",
  },
  {
    id: "ensuite",
    name: "主卫",
    kind: "bathroom",
    polygon: rect(10.2, 1.2, 1.8, 3.05),
    label: [11.1, 2.8],
    description: "主卧内的独立卫生间，进门左墙旁依次为悬浮洗手台与镜子、马桶，镜子无框，水龙头可点击开关水，柜底离地约 0.30 m，再经玻璃门进入淋浴区。湿区按 1.5% 找向左上角地漏，隔断外干区按 1% 找向候选地漏；可在显示设置中开启排水坡向。窗户上方有排气扇，可点击启动或停止。按期望布局预览，尺寸和给排水点位待现场核实。",
  },
  {
    id: "balcony",
    name: "主阳台",
    originalName: "普通阳台",
    kind: "balcony",
    polygon: rect(2.6, 8.65, 4.2, 1.2),
    label: [4.7, 9.25],
    description: "连接客厅，上方有顶板；入口预览四扇玻璃推拉门，左右不留墙垛，中间两扇可点击开合。两侧摆放一高一低的羽状叶树形盆栽，配陶土花盆，中间保留入口通道。外侧可独立对比保持原样与封窗，地面加 1% 找坡与候选地漏，雨水接管、防水和入口高差待现场确认，尺寸和窗型待实测。",
  },
  {
    id: "utility",
    name: "生活阳台",
    originalName: "给水阳台",
    kind: "balcony",
    polygon: rect(2.6, 0, 3.2, 1.2),
    label: [4.2, 0.6],
    description: "上方有顶板，顶板下方中间安装双杆晾衣架。模型按与客餐厅敞开连接的方案展示，外侧可独立对比保持原样与落地玻璃封窗。洗衣机、热水器靠厨房侧，洗衣机门可点击开合，旁边放扫地机器人和充电座；点击机器人按预设路线清扫客餐厅，再次点击暂停或继续，完成后返回充电座。与厨房之间无门；实际位置需保持干燥，并按机型预留回充空间。",
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
    // Full-width glazing between the two perpendicular room walls, without side piers.
    openings: [{ ...door(0, 4.2), top: 2.35 }],
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
    openings: [windowOpening(0.8, 1.8, 0.45)],
  },
  {
    id: "master-south",
    from: [10.2, 8.65],
    to: [13.6, 8.65],
    openings: [windowOpening(0.8, 1.8, 0.45)],
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
    openings: [windowOpening(0.4, 1.8, 0.45)],
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
