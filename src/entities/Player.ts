import Phaser from 'phaser';

/** 使用角色 sprite sheet 的可控制玩家实体。 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private readonly speed = 145;
  private facing: 'down' | 'up' | 'side' = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'characters', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(0.23).setDepth(20).setCollideWorldBounds(true);
    // 大画布帧中角色居中，因此碰撞体只覆盖脚边区域。
    this.body.setSize(58, 42).setOffset(99, 176);

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keys = scene.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  }

  updateMovement(enabled = true): void {
    this.setDepth(Math.round(this.y));
    if (!enabled) {
      this.stopMoving();
      return;
    }

    const left = this.cursors.left.isDown || this.keys.left.isDown;
    const right = this.cursors.right.isDown || this.keys.right.isDown;
    const up = this.cursors.up.isDown || this.keys.up.isDown;
    const down = this.cursors.down.isDown || this.keys.down.isDown;
    const velocity = new Phaser.Math.Vector2(Number(right) - Number(left), Number(down) - Number(up));
    if (velocity.lengthSq() === 0) {
      this.stopMoving();
      return;
    }

    velocity.normalize().scale(this.speed);
    this.setVelocity(velocity.x, velocity.y);
    if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
      this.facing = 'side';
      this.setFlipX(velocity.x < 0);
    } else {
      this.facing = velocity.y < 0 ? 'up' : 'down';
      this.setFlipX(false);
    }
    this.anims.play(`player-walk-${this.facing}`, true);
  }

  stopMoving(): void {
    this.setVelocity(0, 0);
    this.anims.stop();
    this.setFrame({ down: 0, up: 4, side: 8 }[this.facing]);
  }
}
