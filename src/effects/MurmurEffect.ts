import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import { UI_THEME } from '../ui/Theme';

/** 低语增强时在视野边缘留下短句，不遮挡正文和交互区域。 */
export class MurmurEffect {
  private readonly fragments: Phaser.GameObjects.Text[];

  constructor(scene: Phaser.Scene) {
    const phrases = ['……替我们记着……', '墙里还有人', '不要纠正这个下午'];
    const positions = [[34, 150], [GAME_WIDTH - 34, 250], [52, GAME_HEIGHT - 120]];
    this.fragments = phrases.map((phrase, index) => scene.add.text(
      positions[index][0],
      positions[index][1],
      phrase,
      {
        fontFamily: UI_THEME.fonts.body,
        fontSize: '12px',
        color: '#b7b5aa',
      },
    ).setOrigin(index === 1 ? 1 : 0, 0).setScrollFactor(0).setDepth(7200).setAlpha(0));
  }

  update(murmurs: number, isDead: boolean): void {
    const base = Phaser.Math.Clamp((murmurs - 2) * 0.045 + (isDead ? 0.1 : 0), 0, 0.24);
    this.fragments.forEach((fragment, index) => {
      fragment.setAlpha(Math.max(0, base - index * 0.035));
      fragment.x += Math.sin((Date.now() / 1700) + index) * 0.008;
    });
  }

  destroy(): void {
    this.fragments.forEach((fragment) => fragment.destroy());
  }
}

