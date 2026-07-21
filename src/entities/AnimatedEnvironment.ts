import Phaser from 'phaser';

export interface AnimatedEnvironmentConfig {
  x: number;
  y: number;
  animation: string;
  scale?: number;
  depth?: number;
}

/** 从 Tiled Objects 层实例化的纯表现型环境动画。 */
export class AnimatedEnvironment extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, config: AnimatedEnvironmentConfig) {
    super(scene, config.x, config.y, 'environment');
    scene.add.existing(this);
    this.setOrigin(0.5, 0.82)
      .setScale(config.scale ?? 0.32)
      .setDepth(config.depth ?? Math.round(config.y));
    this.play(config.animation);
  }
}
