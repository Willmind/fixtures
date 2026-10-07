# 代码维护与性能定位

## 职责边界

- `src/house/rooms.ts`：房间身份、展示名、原图名称与当前用途。模型、资料、实拍和记录使用同一组稳定 ID。`study` 是次卧 B，`guest` 是书房；不要为匹配新用途修改这些 ID，否则会破坏旧记录与深链接。
- `src/model/plan.ts`：墙体、门窗与房间平面几何；`arrangements.ts`：家具摆位与预览尺寸。调整位置优先改数据，不在界面组件里追加坐标。
- `src/HomeViewer.tsx`：设置界面与 React 状态。传给模型的选项使用 `useMemo`；弹窗和面板状态不进入模型选项。
- `src/model/options.ts`：选项类型及按值比较。房间选择、网格、尺寸、坡向变化只更新场景辅助元素；纯标签变化不刷新镜面。
- `src/model/HomeScene.ts`：渲染、摄像机、建筑、房间标签和生命周期。场景继续按需渲染，不为性能统计增加后台帧循环。
- `src/model/HomeFixtures.ts`：家具装配入口、共享材质与资源、厨房和卫生间等专用设备。逐步提取独立部件，而不是把所有功能迁到另一个大类。
- `src/model/fixtures/FurnitureBuilder.ts`：沙发、茶几、餐桌椅、办公椅、马桶和空调的静态几何。
- `src/model/fixtures/OpeningFixtures.ts`：房门、窗户、阳台推拉门和门外走廊；统一登记柜门、玻璃门与电器门的开合状态。
- `src/model/fixtures/FixtureLighting.ts`：顶灯与床头灯的构造、回路和预设。切换房间、开合面板或调整视角必须保留手动开关状态。
- `src/model/fixtures/interactions.ts`：交互命中标记、鼠标手形提示、点击分派及动画推进。新增交互在此登记，避免提示和实际点击逻辑不一致。

各 builder 通过明确的类型接口接收装配工具与所需材质，不直接访问场景或 React 状态。

## 几何和资源

`BoxGeometryPool` 在单个场景内复用同尺寸、同圆角构件。世界坐标瓷砖 UV 必须独立，否则调整一块瓷砖会改变其他部件。不要对缓存几何直接调用 `translate`、`rotate` 或改写顶点；使用 Mesh 变换，必要时克隆。

场景释放时按几何身份去重，确保共享几何只释放一次；家具负责释放材质、纹理和镜面渲染目标。命中索引缓存模型拓扑，但每次查询仍检查所有祖先的可见性；重建墙体时使索引失效，不能把隐藏家具加入命中结果。

本次六种配置对比（昼夜、完整墙、俯视、两种摆位和空家具）：可见几何边界、顶点数、材质、交互类别及灯光参数保持一致。家具层共 1206 个 Mesh，独立几何由 1173 份降到 701 份；这不是整场景 draw call 或 FPS 测量。

## 性能统计

在模型网址加 `?view=model&debug=performance`，例如本地：

```text
http://127.0.0.1:5173/?view=model&debug=performance
```

打开浏览器开发者工具，在控制台读取：

```js
window.__fixturesPerformance.summary()
window.__fixturesPerformance.reset()
```

最多保留最近 300 个实际渲染帧，返回：

- `medianFrameWorkMs` / `p95FrameWorkMs`：控制器、动画、WebGL 调用和标签渲染的 CPU 耗时，**不含 GPU 完成时间，也不是 FPS**。
- `latest.drawCalls` / `triangles`：该帧包含镜面与阴影的累计绘制数量。
- `latest.renderPasses`：主视图及镜面的场景渲染次数；阴影绘制计入 draw calls，不单独计为场景渲染次数。
- `latest.geometries` / `textures` / `programs`：渲染器已登记的资源数量。
- `updates` / `wallRebuilds`：真正发生的选项更新和墙体重建次数。

分别在白天、黑夜、持续转动、开关家具和静止时采样；测量前 `reset()`，每次比较相同设备、窗口大小和方案。展开方案、打开说明弹窗不应增加 `updates`。正常网址不启用统计；离开模型会释放统计对象。

## 样式

`src/styles.css` 仅管理加载顺序：基础样式 → 公共控件 → 模型与页面框架 → 说明弹窗 → 动画。颜色仍由 `src/theme/theme.css` 的语义变量覆盖。

`src/guide/guide.css` 管理资料页，`src/guide/dialog.css` 管理原图弹窗及其移动端和关闭动画。公共控件不要复制到每个页面；页面差异用该页面的类名限定。保留 reduced-motion 设置，不通过滤镜修改实拍与原图颜色。

## 验证

```sh
npm test
npm run build
```

新增回归覆盖：无关设置不刷新模型、标签不刷新镜面、手动灯光状态保留、门的开合、多个动画同时推进、隐藏物体命中、几何复用与瓷砖 UV 隔离、旧房间记录兼容、性能统计容量与清理。
