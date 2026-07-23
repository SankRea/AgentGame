import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import type { TimeLayer } from '../types/content';

/** 以局部墙面色块渗入表现时间变化，避免全屏白闪和标题卡。 */
export class MemoryBleedEffect {
  private readonly patches: Phaser.GameObjects.Rectangle[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    const geometry = [
      [0, 0, 250, GAME_HEIGHT],
      [GAME_WIDTH - 220, 0, 220, GAME_HEIGHT],
      [230, 0, 300, 100],
      [410, GAME_HEIGHT - 86, 360, 86],
    ];
    geometry.forEach(([x, y, width, height]) => {
      this.patches.push(
        scene.add.rectangle(x, y, width, height, 0xa57c46, 0)
          .setOrigin(0)
          .setScrollFactor(0)
          .setDepth(7300),
      );
    });
  }

  transitionTo(layer: TimeLayer): void {
    const color = layer === 'grave' ? 0x665b68 : layer === 'subjective' ? 0x5e7280 : 0xa57c46;
    const targetAlpha = layer === 'embers' ? 0 : layer === 'grave' ? 0.09 : 0.055;
    this.patches.forEach((patch, index) => {
      patch.setFillStyle(color, 1);
      this.scene.tweens.killTweensOf(patch);
      this.scene.tweens.add({
        targets: patch,
        alpha: targetAlpha,
        duration: 900 + index * 220,
        ease: 'Sine.easeInOut',
      });
    });
  }

  destroy(): void {
    this.patches.forEach((patch) => patch.destroy());
    this.patches.length = 0;
  }
}

