import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';

/** 低强度、局部的水平热浪；不影响 UI，可在设置中关闭。 */
export class HeatHazeEffect {
  private readonly bands: Phaser.GameObjects.Rectangle[] = [];
  private enabled = true;
  private intensity = 0.4;

  constructor(scene: Phaser.Scene) {
    for (let index = 0; index < 7; index += 1) {
      const band = scene.add.rectangle(
        80 + index * 145,
        120 + (index % 4) * 96,
        92 + (index % 3) * 26,
        2,
        0xded7bc,
        0.025,
      ).setScrollFactor(0).setDepth(7400);
      this.bands.push(band);
      scene.tweens.add({
        targets: band,
        x: `+=${index % 2 ? 13 : -13}`,
        alpha: { from: 0.008, to: 0.045 },
        duration: 2100 + index * 190,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  configure(enabled: boolean, intensity: number): void {
    this.enabled = enabled;
    this.intensity = Phaser.Math.Clamp(intensity, 0, 1);
    this.bands.forEach((band) => band.setVisible(enabled));
  }

  update(playerX: number): void {
    if (!this.enabled) return;
    const centerFactor = Phaser.Math.Clamp(1 - Math.abs(playerX - 900) / 900, 0.2, 1);
    this.bands.forEach((band, index) => {
      band.setScale(0.9 + centerFactor * 0.18, 1);
      band.y = Phaser.Math.Wrap(band.y + 0.006 * (index + 1) * this.intensity, 90, GAME_HEIGHT - 70);
      band.x = Phaser.Math.Clamp(band.x, -40, GAME_WIDTH + 40);
    });
  }

  destroy(): void {
    this.bands.forEach((band) => band.destroy());
    this.bands.length = 0;
  }
}

