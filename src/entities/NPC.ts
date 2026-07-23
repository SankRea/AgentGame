import Phaser from 'phaser';
import type { VoiceStyle } from '../types/content';
import type { Player } from './Player';

export interface NPCConfig {
  id: string;
  name: string;
  dialogueId: string;
  texture: string;
  voice?: VoiceStyle;
  x: number;
  y: number;
}

/** 数据驱动的科马拉人物；亡灵以残影而非蓝色辉光呈现。 */
export class NPC extends Phaser.Physics.Arcade.Sprite {
  readonly npcId: string;
  readonly displayName: string;
  readonly dialogueId: string;
  readonly voice: VoiceStyle;
  private readonly indicator: Phaser.GameObjects.Text;
  private readonly shadow: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, config: NPCConfig) {
    super(scene, config.x, config.y, config.texture);
    this.npcId = config.id;
    this.displayName = config.name;
    this.dialogueId = config.dialogueId;
    this.voice = config.voice ?? 'living';
    const shadowOffset = this.voice === 'ghost' ? 14 : this.voice === 'memory' ? -9 : 0;
    this.shadow = scene.add.ellipse(
      config.x + shadowOffset,
      config.y + 22,
      this.voice === 'ghost' ? 23 : 28,
      8,
      0x303438,
      this.voice === 'living' ? 0.22 : 0.07,
    ).setDepth(Math.round(config.y) - 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(2).setDepth(Math.round(config.y)).setImmovable(true);
    this.setAlpha(this.voice === 'living' ? 1 : 0.8);
    this.body.setSize(12, 8).setOffset(5, 19);
    this.indicator = scene.add.text(config.x, config.y - 42, 'E', {
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: '12px',
      color: '#efe3c5',
      backgroundColor: '#24201bcc',
      padding: { x: 5, y: 3 },
    }).setOrigin(0.5).setDepth(9000).setVisible(false);
  }

  canInteract(player: Player): boolean {
    return Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= 70;
  }

  updateIndicator(player: Player, visible = true): void {
    const shadowOffset = this.voice === 'ghost' ? 14 : this.voice === 'memory' ? -9 : 0;
    this.shadow
      .setPosition(this.x + shadowOffset, this.y + 22)
      .setDepth(Math.round(this.y) - 1);
    this.indicator.setPosition(this.x, this.y - 42);
    this.indicator.setVisible(visible && this.canInteract(player));
  }

  setLayerVisibility(visible: boolean): void {
    this.setAlpha(visible ? (this.voice === 'living' ? 1 : 0.8) : 0.08);
    const visibleAlpha = this.voice === 'living' ? 0.22 : 0.07;
    this.shadow.setAlpha(visible ? visibleAlpha : 0.015);
  }

  destroy(fromScene?: boolean): void {
    this.indicator.destroy();
    this.shadow.destroy();
    super.destroy(fromScene);
  }
}
