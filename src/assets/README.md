# 临时资源说明

当前 Demo 已使用项目内的真实像素 PNG 素材：

- `sprites/characters-sheet.png`：4x4，玩家三方向行走与老人待机动画
- `sprites/environment-sheet.png`：4x4，灯笼、水井、树木和花丛动画
- `sprites/terrain-tiles.png`：5x1，Tiled 使用的 32x32 地块

`maps/` 中包含可由 Tiled 打开的 JSON 地图。地图 tileset 名称必须保持为 `terrain`，
图层中的环境对象通过 `animation` 与 `scale` 属性选择 sprite sheet 动画。

原始生成稿和 chroma 中间文件用于后续美术迭代；运行 `npm run assets:process` 可重新
规格化为 Phaser 使用的最终尺寸。
