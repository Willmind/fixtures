# 第三方组件

## dxf-viewer 1.0.49

- 来源：https://github.com/vagran/dxf-viewer
- 许可证：Mozilla Public License 2.0（MPL-2.0）。
- 通过 npm 引用原包，未修改其源文件。浏览器中使用其 DXF 解析和 Three.js 渲染功能。
- 对应版本源代码可从 npm 的 `dxf-viewer@1.0.49` 包获得；完整许可证随静态产物放在 `licenses/dxf-viewer-LICENSE`。

## @mlightcad/libredwg-web 0.7.14

- 来源：https://github.com/mlightcad/libredwg-web
- 许可证：GNU GPL v3。
- 仅作为开发依赖，由独立 Node 命令 `scripts/convert-dwg.mjs` 调用；不打包进浏览器，也不随静态部署发布 WASM。
- 本仓库调用它的独立转换脚本 `convert-dwg.mjs` 和 `dxf-layer-state.mjs` 以 GPL-3.0-or-later 提供。第三方源代码及许可证随 npm 包提供。

## Fixtures CAD Sans

- 上游：Google Fonts 发布的 Noto Sans SC，来源：https://github.com/google/fonts/tree/main/ofl/notosanssc 。
- 原字体下载：https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf 。
- 许可证：SIL Open Font License 1.1，完整文本位于 `public/fonts/OFL.txt`。
- 使用 FontTools 固定字重 400，并保留拉丁字符、常用标点、数学符号、中日韩统一表意文字及全角字符子集。修改后的名称为 Fixtures CAD Sans；字形未人工修改。
- 这是用于浏览的替代字体，并非原 DWG 的 SHX 字体。
