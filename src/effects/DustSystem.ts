import Phaser from 'phaser';

/** 世界空间中的稀疏尘埃，不使用粒子爆发或魔法光点。 */
export class DustSystem {
  private readonly grains: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene, width: number, height: number) {
    for (let index = 0; index < 24; index += 1) {
      const grain = scene.add.rectangle(
        40 + ((index * 191) % (width - 80)),
        70 + ((index * 127) % (height - 140)),
        index % 5 === 0 ? 3 : 2,
        1,
        0xd9d0b4,
        0.16,
      ).setDepth(680);
      this.grains.push(grain);
      scene.tweens.add({
        targets: grain,
        x: `+=${32 + (index % 4) * 10}`,
        y: `-=${4 + (index % 3) * 3}`,
        alpha: { from: 0.05, to: 0.22 },
        duration: 7200 + index * 230,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  setMutedByLayer(grave: boolean): void {
    this.grains.forEach((grain) => grain.setAlpha(grave ? 0.05 : 0.16));
  }

  destroy(): void {
    this.grains.forEach((grain) => grain.destroy());
    this.grains.length = 0;
  }
}

