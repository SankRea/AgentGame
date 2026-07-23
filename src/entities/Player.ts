import Phaser from 'phaser';

/** 胡安·普雷西亚多的三方向程序化像素角色。 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private readonly speed = 138;
  private facing: 'down' | 'up' | 'side' = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'juan-down');
    this.shadow = scene.add.ellipse(x, y + 22, 28, 9, 0x303438, 0.24);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(2).setDepth(20).setCollideWorldBounds(true);
    this.body.setSize(12, 8).setOffset(5, 19);
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
    this.shadow.setPosition(this.x, this.y + 22).setDepth(Math.round(this.y) - 1);
    if (!enabled) {
      this.stopMoving();
      return;
    }
    const velocity = new Phaser.Math.Vector2(
      Number(this.cursors.right.isDown || this.keys.right.isDown)
        - Number(this.cursors.left.isDown || this.keys.left.isDown),
      Number(this.cursors.down.isDown || this.keys.down.isDown)
        - Number(this.cursors.up.isDown || this.keys.up.isDown),
    );
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
    this.setTexture(`juan-${this.facing}`);
    this.setScale(2, 2 + Math.sin(this.scene.time.now / 82) * 0.04);
  }

  stopMoving(): void {
    this.setVelocity(0, 0);
    this.setScale(2);
  }

  setDead(isDead: boolean): void {
    this.shadow.setAlpha(isDead ? 0.025 : 0.24);
  }

  destroy(fromScene?: boolean): void {
    this.shadow.destroy();
    super.destroy(fromScene);
  }
}
