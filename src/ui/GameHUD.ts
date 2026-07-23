import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import type { DirectionalCaption as CaptionData } from '../systems/AmbientAudioSystem';
import type { NarrativeStatus } from '../systems/NarrativeStatusSystem';
import type { GameSettings } from '../systems/SaveSystem';
import { DirectionalCaption } from './DirectionalCaption';
import { MemoryPanel } from './MemoryPanel';
import { SettingsPanel } from './SettingsPanel';
import { UI_THEME } from './Theme';
import { Toast } from './Toast';

export interface GameHUDCallbacks {
  onSettingsChanged: (settings: GameSettings) => void;
  onReturnToTitle: () => void;
  onDeleteSave: () => void;
}

/** 默认只保留地点、当前遗愿和交互；隐性状态通过颜色、重影与文字磨损反馈。 */
export class GameHUD {
  private readonly locationText: Phaser.GameObjects.Text;
  private readonly objectiveText: Phaser.GameObjects.Text;
  private readonly sensoryText: Phaser.GameObjects.Text;
  private readonly promptText: Phaser.GameObjects.Text;
  private readonly overlay: Phaser.GameObjects.Rectangle;
  private readonly memoryPanel: MemoryPanel;
  private readonly toast: Toast;
  private readonly pausePanel: Phaser.GameObjects.Container;
  private readonly settingsPanel: SettingsPanel;
  private readonly directionalCaption: DirectionalCaption;
  private deleteArmed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly settings: GameSettings,
    private readonly callbacks: GameHUDCallbacks,
  ) {
    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: UI_THEME.fonts.body,
      color: UI_THEME.colors.chalk,
      backgroundColor: '#303438d9',
      padding: { x: 9, y: 6 },
    };
    this.locationText = scene.add.text(16, 14, '', {
      ...labelStyle,
      fontFamily: UI_THEME.fonts.display,
      fontSize: '16px',
    }).setDepth(10000).setScrollFactor(0);
    this.objectiveText = scene.add.text(16, 50, '', {
      ...labelStyle,
      fontSize: '13px',
      color: '#e5dcc5',
    }).setDepth(10000).setScrollFactor(0);
    this.sensoryText = scene.add.text(GAME_WIDTH - 16, 16, '', {
      ...labelStyle,
      fontSize: '12px',
      color: '#c9ccd0',
      align: 'right',
      wordWrap: { width: 340 },
    }).setOrigin(1, 0).setDepth(10000).setScrollFactor(0);
    this.promptText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '', {
      ...labelStyle,
      fontFamily: UI_THEME.fonts.mono,
      fontSize: '12px',
      color: '#f2ead7',
    }).setOrigin(0.5).setDepth(10020).setScrollFactor(0).setAlpha(0);
    this.overlay = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x4a3d32, 0)
      .setOrigin(0).setScrollFactor(0).setDepth(8000).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.memoryPanel = new MemoryPanel(scene);
    this.toast = new Toast(scene);
    this.directionalCaption = new DirectionalCaption(scene);
    this.pausePanel = this.createPausePanel();
    this.settingsPanel = new SettingsPanel(
      scene,
      settings,
      (next) => {
        this.applySettings(next);
        this.callbacks.onSettingsChanged(next);
      },
      () => this.pausePanel.setVisible(true),
    );
    this.applySettings(settings);
  }

  get isBlocking(): boolean {
    return this.memoryPanel.visible || this.pausePanel.visible || this.settingsPanel.visible;
  }

  setLocation(location: string): void {
    this.locationText.setText(location);
  }

  updateNarrative(status: NarrativeStatus, objective: string, sensory: string, itemNames: string[]): void {
    this.objectiveText.setText(objective);
    this.sensoryText.setText(sensory);
    this.memoryPanel.updateContent(status, itemNames);
    const murmurAlpha = Math.min(0.2, status.murmurs * 0.02);
    const clarityAlpha = Math.max(0, (70 - status.clarity) / 360);
    this.overlay.setFillStyle(status.isDead ? 0x3e3435 : 0x5b3e2f, 1);
    this.overlay.setAlpha(Math.max(murmurAlpha, clarityAlpha));
    this.sensoryText.setAlpha(status.clarity <= 55 ? 0.72 : 1);
  }

  setPrompt(message?: string): void {
    if (!message || this.isBlocking) {
      this.promptText.setAlpha(0);
      return;
    }
    this.promptText.setText(`E  ${message}`).setAlpha(1);
  }

  showToast(message: string): void {
    this.toast.show(message);
  }

  showDirectionalCaption(caption: CaptionData): void {
    if (this.settings.directionalCaptions) this.directionalCaption.show(caption);
  }

  applySettings(settings: GameSettings): void {
    const background = settings.highContrastText ? '#111315f2' : '#303438d9';
    [this.locationText, this.objectiveText, this.sensoryText, this.promptText]
      .forEach((text) => text.setBackgroundColor(background));
    this.locationText.setColor(settings.highContrastText ? '#ffffff' : UI_THEME.colors.chalk);
    this.objectiveText.setColor(settings.highContrastText ? '#fff6d9' : '#e5dcc5');
    this.sensoryText.setColor(settings.highContrastText ? '#ffffff' : '#c9ccd0');
  }

  toggleJournal(): void {
    if (this.pausePanel.visible || this.settingsPanel.visible) return;
    this.memoryPanel.toggle();
    this.setPrompt();
  }

  togglePause(): void {
    if (this.settingsPanel.visible) {
      this.settingsPanel.close();
      return;
    }
    if (this.memoryPanel.visible) {
      this.memoryPanel.setVisible(false);
      return;
    }
    this.deleteArmed = false;
    this.pausePanel.setVisible(!this.pausePanel.visible);
    this.setPrompt();
  }

  handleKey(event: KeyboardEvent): boolean {
    return this.settingsPanel.handleKey(event);
  }

  private createPausePanel(): Phaser.GameObjects.Container {
    const shade = this.scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x25292c, 0.76).setOrigin(0);
    const plate = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 380, 300, 0x34383a, 0.98)
      .setStrokeStyle(1, UI_THEME.colors.dust, 0.78);
    const title = this.scene.add.text(GAME_WIDTH / 2, 166, '科马拉没有停下', {
      fontFamily: UI_THEME.fonts.display,
      fontSize: '25px',
      color: UI_THEME.colors.chalk,
    }).setOrigin(0.5);
    const controls = this.scene.add.text(GAME_WIDTH / 2, 205, 'K 手动保存  ·  Tab 记忆簿  ·  H 对话记录', {
      fontFamily: UI_THEME.fonts.mono,
      fontSize: '10px',
      color: '#bfc4c5',
    }).setOrigin(0.5);
    const container = this.scene.add.container(0, 0, [shade, plate, title, controls])
      .setDepth(17000).setScrollFactor(0).setVisible(false);

    const addButton = (y: number, label: string, onClick: (button: Phaser.GameObjects.Text) => void): void => {
      const button = this.scene.add.text(GAME_WIDTH / 2, y, label, {
        fontFamily: UI_THEME.fonts.ui,
        fontSize: '14px',
        color: '#eef0e8',
        backgroundColor: '#4b5052',
        padding: { x: 18, y: 7 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      button.on('pointerover', () => button.setBackgroundColor('#687074'));
      button.on('pointerout', () => button.setBackgroundColor('#4b5052'));
      button.on('pointerdown', () => onClick(button));
      container.add(button);
    };

    addButton(252, '继续聆听', () => this.togglePause());
    addButton(294, '设置与可访问性', () => {
      this.pausePanel.setVisible(false);
      this.settingsPanel.open();
    });
    addButton(336, '返回标题', () => this.callbacks.onReturnToTitle());
    addButton(378, '删除存档', (button) => {
      if (!this.deleteArmed) {
        this.deleteArmed = true;
        button.setText('再次点击，确认忘记这一切');
        return;
      }
      this.callbacks.onDeleteSave();
    });
    return container;
  }
}
