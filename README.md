# 得道成仙 / AscendToImmortality

基于 Phaser 3、TypeScript 和 Vite 的中式志怪心理恐怖剧情游戏。

> 凡人追求长生，却逐渐发现所谓成仙可能是一场骗局。

## 运行

```powershell
npm install
npm run dev
```

## 第一章：尸解山

玩家以无名修士身份来到青玄观。传闻青玄真人已飞升百年，但每逢月圆之夜，观中都会
传来敲击棺材的声音。当前测试区域包含荒山石阶、山门、香炉、残破道观、竹林和墓地。

## 操作

- `WASD` / 方向键：行走
- `E`：交谈或探查
- 空格 / 回车 / 鼠标：推进对话
- 方向键 / 数字键：选择对话选项
- `U`：使用镇尸黄符
- `K`：记录命数

## 数据目录

```text
src/data/
├── dialogue/       节点、选项、隐藏条件与剧情效果
├── events/         地图区域与调查事件
├── endings/        四类尸解主题结局规则
├── cultivation/    初始修士状态与因果行为表
├── npcs/           NPC身份、地图、位置和对话入口
├── items/          道具、古籍残卷与使用效果
├── quests/         第一章任务链
└── achievements/   成就条件
```

`QingxuanTempleMap` 是当前 Graphics 测试地图 provider；原有 `MapSystem` 保留为未来 Tiled
地图加载器。剧情、NPC、事件、物品、任务和结局均由 JSON 驱动。
