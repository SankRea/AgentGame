import Phaser from 'phaser';
import { gameConfig } from './config/GameConfig';
import './style.css';

const game = new Phaser.Game(gameConfig);

// 让 Vite 热更新时正确销毁旧实例，避免重复创建 Canvas。
if (import.meta.hot) {
  import.meta.hot.dispose(() => game.destroy(true));
}
