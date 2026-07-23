import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import type { GameSettings } from '../systems/SaveSystem';
import { UI_THEME } from './Theme';

interface SettingRow {
  label: string;
  value: () => string;
  change: (direction: number) => void;
}

/** 鼠标与键盘均可操作的设置面板。 */
export class SettingsPanel extends Phaser.GameObjects.Container {
  private readonly rows: SettingRow[];
  private readonly rowTexts: Phaser.GameObjects.Text[] = [];
  private selected = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly settings: GameSettings,
    private readonly onChanged: (settings: GameSettings) => void,
    private readonly onClose: () => void,
  ) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(19000).setScrollFactor(0).setVisible(false);
    this.rows = this.createRows();

    const shade = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x303235, 0.72)
      .setOrigin(0)
      .setInteractive();
    const panel = scene.add.rectangle(88, 30, GAME_WIDTH - 176, GAME_HEIGHT - 60, 0xd9d0b4, 0.985)
      .setOrigin(0)
      .setStrokeStyle(1, 0x667078, 0.9);
    const title = scene.add.text(118, 54, '设置与可访问性', {
      fontFamily: UI_THEME.fonts.display,
      fontSize: '24px',
      color: '#241d1a',
    });
    const hint = scene.add.text(GAME_WIDTH - 118, 61, '↑↓ 选择  ←→ 调整  Enter 切换  Esc 返回', {
      fontFamily: UI_THEME.fonts.mono,
      fontSize: '10px',
      color: '#665b68',
    }).setOrigin(1, 0);
    this.add([shade, panel, title, hint]);

    this.rows.forEach((row, index) => {
      const text = scene.add.text(126, 100 + index * 34, '', {
        fontFamily: UI_THEME.fonts.ui,
        fontSize: '14px',
        color: '#453a33',
        padding: { x: 9, y: 5 },
      }).setInteractive({ useHandCursor: true });
      text.on('pointerover', () => {
        this.selected = index;
        this.refresh();
      });
      text.on('pointerdown', () => this.changeSelected(1));
      this.rowTexts.push(text);
      this.add(text);
    });

    const close = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 52, '返回', {
      fontFamily: UI_THEME.fonts.ui,
      fontSize: '15px',
      color: '#302824',
      backgroundColor: '#b7b5aa',
      padding: { x: 18, y: 7 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.close());
    this.add(close);
    this.refresh();
  }

  open(): void {
    this.setVisible(true);
    this.refresh();
  }

  close(): void {
    this.setVisible(false);
    this.onClose();
  }

  handleKey(event: KeyboardEvent): boolean {
    if (!this.visible) return false;
    if (event.code === 'ArrowUp' || event.code === 'KeyW') {
      this.selected = Phaser.Math.Wrap(this.selected - 1, 0, this.rows.length);
      this.refresh();
    } else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
      this.selected = Phaser.Math.Wrap(this.selected + 1, 0, this.rows.length);
      this.refresh();
    } else if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
      this.changeSelected(-1);
    } else if (event.code === 'ArrowRight' || event.code === 'KeyD' || event.code === 'Enter' || event.code === 'Space') {
      this.changeSelected(1);
    } else if (event.code === 'Escape') {
      this.close();
    }
    return true;
  }

  private createRows(): SettingRow[] {
    const percent = (value: number): string => `${Math.round(value * 100)}%`;
    const toggle = (
      key: 'autoAdvance' | 'heatHaze' | 'subtleFlashes' | 'highContrastText' | 'directionalCaptions',
    ): void => {
      switch (key) {
        case 'autoAdvance':
          this.settings.autoAdvance = !this.settings.autoAdvance;
          break;
        case 'heatHaze':
          this.settings.heatHaze = !this.settings.heatHaze;
          break;
        case 'subtleFlashes':
          this.settings.subtleFlashes = !this.settings.subtleFlashes;
          break;
        case 'highContrastText':
          this.settings.highContrastText = !this.settings.highContrastText;
          break;
        case 'directionalCaptions':
          this.settings.directionalCaptions = !this.settings.directionalCaptions;
          break;
      }
    };
    const step = (key: 'masterVolume' | 'environmentVolume' | 'dialogueVolume' | 'shakeIntensity', direction: number): void => {
      this.settings[key] = Phaser.Math.Clamp(this.settings[key] + direction * 0.1, 0, 1);
    };
    return [
      { label: '主音量', value: () => percent(this.settings.masterVolume), change: (d) => step('masterVolume', d) },
      { label: '环境音', value: () => percent(this.settings.environmentVolume), change: (d) => step('environmentVolume', d) },
      { label: '对话音效', value: () => percent(this.settings.dialogueVolume), change: (d) => step('dialogueVolume', d) },
      {
        label: '文字速度',
        value: () => this.settings.textSpeed <= 16 ? '快' : this.settings.textSpeed >= 38 ? '慢' : '标准',
        change: (d) => {
          const speeds = [42, 24, 14];
          const current = speeds.reduce((best, value, index) =>
            Math.abs(value - this.settings.textSpeed) < Math.abs(speeds[best] - this.settings.textSpeed) ? index : best, 0);
          this.settings.textSpeed = speeds[Phaser.Math.Wrap(current + d, 0, speeds.length)];
        },
      },
      { label: '自动推进', value: () => this.settings.autoAdvance ? '开' : '关', change: () => toggle('autoAdvance') },
      { label: '镜头震动', value: () => percent(this.settings.shakeIntensity), change: (d) => step('shakeIntensity', d) },
      { label: '热浪效果', value: () => this.settings.heatHaze ? '开' : '关', change: () => toggle('heatHaze') },
      { label: '轻微闪变', value: () => this.settings.subtleFlashes ? '开' : '关', change: () => toggle('subtleFlashes') },
      { label: '高对比文本', value: () => this.settings.highContrastText ? '开' : '关', change: () => toggle('highContrastText') },
      { label: '方向字幕', value: () => this.settings.directionalCaptions ? '开' : '关', change: () => toggle('directionalCaptions') },
      {
        label: '全屏',
        value: () => this.scene.scale.isFullscreen ? '开' : '关',
        change: () => {
          if (this.scene.scale.isFullscreen) this.scene.scale.stopFullscreen();
          else void this.scene.scale.startFullscreen();
        },
      },
    ];
  }

  private changeSelected(direction: number): void {
    this.rows[this.selected].change(direction);
    this.onChanged(this.settings);
    this.refresh();
  }

  private refresh(): void {
    this.rowTexts.forEach((text, index) => {
      const row = this.rows[index];
      const active = index === this.selected;
      text.setText(`${active ? '›' : ' '} ${row.label.padEnd(8, '　')}  ${row.value()}`);
      text.setColor(active ? '#19191a' : '#51473f');
      text.setBackgroundColor(active ? '#c8c8bd' : 'rgba(0,0,0,0)');
    });
  }
}
