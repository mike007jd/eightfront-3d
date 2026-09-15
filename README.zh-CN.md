[English](README.md) | **简体中文** | [日本語](README.ja.md)

# Eight Fronts

八关、本地双人、现代/复古操作的非官方 Three.js 致敬游戏；程序化原创资产，运行资源全部内嵌，没有 CDN 请求。

## 运行

```bash
npm run build
```

生成 `vendor/three.bundle.js` 与 `dist/index.html`（均为生成物，不入库）。桌面浏览器直接打开 `dist/index.html`，或执行 `npm run serve` 后打开终端显示的本机地址。需要 Node.js 20 或更新版本，不需要安装 npm 依赖。

## 操作

P1：WASD、J/鼠标射击、SPACE/K 跳跃、Q 换枪、E/G 手雷、SHIFT 原地瞄准、ESC 暂停。P2：方向键、/ 射击、. 跳跃、, 换枪、' 手雷；也支持小键盘。

基地普通房间需要横移对列；低位目标先松开移动和 SHIFT，再按下键趴射；高位目标需跳射。鼠标不代替基地姿态切换。核心全毁后向前进入下一室。设置里的情境指引保留，不必熟悉原版才开始。

## 许可

代码以 Apache License 2.0 提供（见 [LICENSE](LICENSE)），再分发时须随附 LICENSE 与 [NOTICE.md](NOTICE.md)。内嵌的 Three.js r179 遵循其自带 MIT 许可，全文在 `vendor/THREE-LICENSE.txt`，再分发时须随附。本项目是非官方致敬作品，与 Konami 无关；商标与资产来源声明见 [NOTICE.md](NOTICE.md)。

