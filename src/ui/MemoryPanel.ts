import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import type { NarrativeStatus } from '../systems/NarrativeStatusSystem';
import { UI_THEME } from './Theme';

interface MemoryDefinition {
  id: string;
  title: string;
  summary: string;
}

export class MemoryPanel extends Phaser.GameObjects.Container {
  private readonly content: Phaser.GameObjects.Text;
  private readonly layerText: Phaser.GameObjects.Text;
  private memories: MemoryDefinition[] = [];

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(15000).setScrollFactor(0).setVisible(false);
    this.memories = scene.cache.json.get('memories') as MemoryDefinition[];

    const shade = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x171411, 0.76).setOrigin(0);
    const panel = scene.add.rectangle(92, 48, GAME_WIDTH - 184, GAME_HEIGHT - 96, 0xcab58d, 0.98)
      .setOrigin(0)
      .setStrokeStyle(2, UI_THEME.colors.ink, 0.9);
    const title = scene.add.text(122, 78, '记忆簿', {
      fontFamily: UI_THEME.fonts.display,
      fontSize: '27px',
      color: UI_THEME.colors.inkCss,
      fontStyle: 'bold',
    });
    this.layerText = scene.add.text(GAME_WIDTH - 122, 88, '', {
      fontFamily: UI_THEME.fonts.mono,
      fontSize: '11px',
      color: '#65513f',
    }).setOrigin(1, 0);
    this.content = scene.add.text(122, 132, '', {
      fontFamily: UI_THEME.fonts.body,
      fontSize: '14px',
      color: '#30261f',
      lineSpacing: 7,
      wordWrap: { width: GAME_WIDTH - 244 },
    });
    const hint = scene.add.text(GAME_WIDTH - 122, GAME_HEIGHT - 78, 'Tab 合上记忆簿', {
      fontFamily: UI_THEME.fonts.mono,
      fontSize: '11px',
      color: '#685643',
    }).setOrigin(1);
    this.add([shade, panel, title, this.layerText, this.content, hint]);
  }

  updateContent(status: NarrativeStatus, items: string[]): void {
    const discovered = this.memories.slice(0, Math.min(status.memory, this.memories.length));
    const memories = discovered.length
      ? discovered.map((memory) => `◆ ${memory.title}\n  ${memory.summary}`).join('\n\n')
      : '尚未拼合任何记忆。';
    const clues = status.fatherClues >= 3
      ? '佩德罗的名字已与土地、债务和教堂连在一起。'
      : status.fatherClues > 0
        ? '关于佩德罗的说法仍然互相遮挡。'
        : '关于父亲，只有母亲留下的名字。';
    this.layerText.setText(`叙述层：${this.layerName(status.currentTimeLayer)}`);
    this.content.setText(
      `当前遗愿\n${status.isDead ? '决定是否继续留在墓中聆听。' : '寻找佩德罗·巴拉莫，也确认母亲要求索回的究竟是什么。'}\n\n`
      + `已经拼合的记忆\n${memories}\n\n`
      + `父亲的线索\n${clues}\n\n`
      + `随身遗物\n${items.length ? items.join(' · ') : '无'}`,
    );
  }

  toggle(): boolean {
    this.setVisible(!this.visible);
    return this.visible;
  }

  private layerName(layer: NarrativeStatus['currentTimeLayer']): string {
    return {
      embers: '余烬',
      past: '往昔',
      grave: '墓中',
      subjective: '主观记忆',
    }[layer];
  }
}

