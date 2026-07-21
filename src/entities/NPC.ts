import Phaser from 'phaser';
import type { Player } from './Player';

export interface NPCConfig {
  id: string;
  name: string;
  dialogueId: string;
  texture: string;
  animation?: string;
  x: number;
  y: number;
}

/** 数据驱动 NPC；id 与 dialogueId 解耦，便于以后切换任务阶段台词。 */
export class NPC extends Phaser.Physics.Arcade.Sprite {
  readonly npcId: string;
  readonly displayName: string;
  readonly dialogueId: string;
  private readonly indicator: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, config: NPCConfig) {
    super(scene, config.x, config.y, config.texture, 12);
    this.npcId = config.id;
    this.displayName = config.name;
    this.dialogueId = config.dialogueId;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(0.24).setDepth(Math.round(config.y)).setImmovable(true);
    this.body.setSize(64, 42).setOffset(96, 184);
    this.play(config.animation ?? 'npc-old-man-idle');

    this.indicator = scene.add.text(config.x, config.y - 38, 'E', {
      fontFamily: 'monospace', fontSize: '14px', color: '#fff2b5',
      backgroundColor: '#1b2029', padding: { x: 5, y: 2 },
    }).setOrigin(0.5).setDepth(9000).setVisible(false);
  }

  canInteract(player: Player): boolean {
    return Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= 70;
  }

  updateIndicator(player: Player, visible = true): void {
    this.indicator.setVisible(visible && this.canInteract(player));
  }

  destroy(fromScene?: boolean): void {
    this.indicator.destroy();
    super.destroy(fromScene);
  }
}
