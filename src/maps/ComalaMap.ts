import Phaser from 'phaser';
import { VISUAL_THEME } from '../config/VisualTheme';
import type { TimeLayer } from '../types/content';

export interface ComalaMapRuntime {
  key: string;
  name: string;
  width: number;
  height: number;
  obstacles: Phaser.Physics.Arcade.StaticGroup;
  spawn: Phaser.Math.Vector2;
  setTimeLayer: (layer: TimeLayer) => void;
}

/** 科马拉单地图纵向切片：空间连续，时间层通过重绘同一地点呈现。 */
export class ComalaMap {
  readonly key = 'comala';
  readonly name = '科马拉 · 空街';
  readonly width = 1680;
  readonly height = 1040;
  private scene?: Phaser.Scene;
  private base?: Phaser.GameObjects.Graphics;
  private memory?: Phaser.GameObjects.Graphics;
  private obstacles?: Phaser.Physics.Arcade.StaticGroup;
  private silhouettes: Phaser.GameObjects.Rectangle[] = [];

  create(scene: Phaser.Scene): ComalaMapRuntime {
    this.scene = scene;
    this.base = scene.add.graphics().setDepth(0);
    this.memory = scene.add.graphics().setDepth(1);
    this.drawBase(this.base);
    this.drawMemory(this.memory);
    this.createDistantFigures(scene);

    const obstacles = scene.physics.add.staticGroup();
    this.obstacles = obstacles;
    const block = (x: number, y: number, width: number, height: number): void => {
      const body = obstacles.create(x, y, 'juan-down') as Phaser.Physics.Arcade.Image;
      body.setDisplaySize(width, height).setVisible(false).refreshBody();
    };
    block(this.width / 2, 8, this.width, 16);
    block(this.width / 2, this.height - 8, this.width, 16);
    block(8, this.height / 2, 16, this.height);
    block(this.width - 8, this.height / 2, 16, this.height);
    block(260, 545, 275, 150);
    block(710, 505, 270, 150);
    block(1205, 235, 285, 160);
    block(1455, 495, 300, 150);

    scene.physics.world.setBounds(0, 0, this.width, this.height);
    scene.cameras.main.setBounds(0, 0, this.width, this.height);
    return {
      key: this.key,
      name: this.name,
      width: this.width,
      height: this.height,
      obstacles,
      spawn: new Phaser.Math.Vector2(265, 920),
      setTimeLayer: (layer) => this.setTimeLayer(layer),
    };
  }

  destroy(): void {
    this.silhouettes.forEach((item) => item.destroy());
    this.silhouettes = [];
    this.obstacles?.clear(true, true);
    this.obstacles = undefined;
    this.base?.destroy();
    this.memory?.destroy();
    this.base = undefined;
    this.memory = undefined;
    this.scene = undefined;
  }

  private drawBase(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(VISUAL_THEME.reality.dustYellow).fillRect(0, 0, this.width, this.height);
    g.fillStyle(VISUAL_THEME.reality.dryEarth);
    for (let y = 24; y < this.height; y += 38) {
      for (let x = (y % 76) + 10; x < this.width; x += 67) {
        g.fillRect(x, y, 2 + ((x + y) % 4), 2);
      }
    }
    g.fillStyle(0x796752).fillTriangle(0, 0, 500, 0, 0, 760);
    g.fillTriangle(this.width, 0, 1280, 0, this.width, 710);
    g.fillStyle(0xc0a86e).fillRect(130, 720, 1420, 250);
    g.lineStyle(3, 0x796752, 0.55);
    g.lineBetween(90, 970, 1590, 660);
    g.lineBetween(60, 885, 1580, 610);

    this.drawHouse(g, 115, 430, 290, 230, 0xd9d0b4);
    this.drawHouse(g, 575, 390, 290, 250, 0xded7bc);
    this.drawHouse(g, 1310, 375, 300, 260, 0xcfc6ac);
    this.drawChurch(g);
    this.drawCemetery(g);
    this.drawMediLuna(g);
    this.drawAbandonedDetails(g);
    this.drawDryPlants(g);
  }

  private drawHouse(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    wall: number,
  ): void {
    g.fillStyle(0x4e4036).fillRect(x - 12, y - 15, width + 24, 28);
    g.fillStyle(wall).fillRect(x, y, width, height);
    g.fillStyle(VISUAL_THEME.reality.doorway).fillRect(x + 42, y + 74, 68, height - 74);
    g.fillRect(x + width - 92, y + 55, 54, 72);
    g.fillStyle(0x665b68, 0.22).fillTriangle(x + 110, y + 74, x + 168, y + height, x + 110, y + height);
    g.lineStyle(2, 0xa57c46, 0.62);
    g.lineBetween(x + 146, y + 8, x + 138, y + 100);
    g.lineBetween(x + 138, y + 100, x + 155, y + 174);
    g.fillStyle(0x796752).fillRect(x - 8, y + height, width + 16, 12);
  }

  private drawChurch(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xd9d0b4).fillRect(1070, 210, 285, 230);
    g.fillStyle(0xcfc6ac).fillRect(1150, 80, 105, 260);
    g.fillStyle(0x4e4036).fillTriangle(1135, 95, 1203, 28, 1270, 95);
    g.fillStyle(VISUAL_THEME.reality.doorway).fillRect(1182, 122, 42, 58);
    g.fillEllipse(1203, 128, 30, 30);
    g.fillRect(1168, 305, 70, 135);
    g.lineStyle(3, 0xa0835f).strokeRect(1085, 225, 255, 200);
    g.lineBetween(1100, 275, 1140, 260);
    g.lineBetween(1270, 250, 1315, 296);
  }

  private drawCemetery(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x796752).fillEllipse(1445, 184, 350, 210);
    g.lineStyle(2, 0x4e4036, 0.52).strokeEllipse(1445, 184, 350, 210);
    g.fillStyle(0x978b73).fillRoundedRect(1310, 173, 18, 27, 3);
    g.fillStyle(0x817763).fillRoundedRect(1552, 126, 15, 24, 3);
    g.fillStyle(VISUAL_THEME.reality.doorway).fillEllipse(1432, 224, 104, 40);
    g.lineStyle(2, 0x34383a, 0.35);
    g.lineBetween(1385, 226, 1480, 221);
    g.lineBetween(1410, 207, 1462, 242);
  }

  private drawMediLuna(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x553b2c, 0.8).fillRect(1390, 555, 250, 115);
    g.fillTriangle(1350, 570, 1510, 480, 1665, 570);
    g.fillStyle(0x241c19).fillRect(1475, 585, 64, 85);
    g.lineStyle(2, 0xc2a372, 0.35).strokeCircle(1510, 535, 46);
  }

  private drawDryPlants(g: Phaser.GameObjects.Graphics): void {
    for (let index = 0; index < 34; index += 1) {
      const x = 70 + ((index * 137) % 1530);
      const y = 700 + ((index * 83) % 270);
      g.lineStyle(2, 0x5e472d, 0.8);
      g.lineBetween(x, y, x + (index % 2 ? 6 : -5), y - 21);
      g.lineBetween(x, y - 10, x + 12, y - 17);
    }
  }

  private drawAbandonedDetails(g: Phaser.GameObjects.Graphics): void {
    // 枯井：比任务图标更像一个被遗忘的生活痕迹。
    g.fillStyle(0x4e4036).fillEllipse(948, 690, 112, 46);
    g.fillStyle(0x27292a).fillEllipse(948, 686, 80, 28);
    g.lineStyle(3, 0x817763, 0.76).strokeEllipse(948, 690, 112, 46);
    // 半月庄方向的一块晾布和无人摇椅。
    g.fillStyle(0xb7b5aa, 0.7).fillRect(1502, 685, 42, 24);
    g.lineStyle(3, 0x4e4036, 0.8);
    g.lineBetween(756, 694, 775, 731);
    g.lineBetween(775, 731, 802, 731);
    g.lineBetween(763, 713, 799, 700);
    g.lineBetween(797, 700, 806, 729);
    g.lineStyle(2, 0x665b68, 0.22);
    g.lineBetween(806, 729, 852, 739);
  }

  private drawMemory(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xe5c56e, 0.08).fillRect(0, 0, this.width, this.height);
    g.fillStyle(0x6f7b45, 0.48);
    for (let index = 0; index < 26; index += 1) {
      g.fillEllipse(100 + ((index * 113) % 1460), 710 + ((index * 37) % 250), 24, 9);
    }
    g.fillStyle(0x372a22, 0.24);
    for (let index = 0; index < 18; index += 1) {
      const x = 540 + ((index * 73) % 720);
      const y = 570 + ((index * 29) % 145);
      g.fillRect(x, y, 8, 24);
      g.fillCircle(x + 4, y - 5, 5);
    }
    g.setVisible(false);
  }

  private createDistantFigures(scene: Phaser.Scene): void {
    [[1030, 590], [1510, 715], [510, 675]].forEach(([x, y], index) => {
      const figure = scene.add.rectangle(x, y, 10, 32, 0x2d2521, 0.24).setDepth(y);
      this.silhouettes.push(figure);
      scene.tweens.add({
        targets: figure,
        alpha: { from: 0, to: 0.28 },
        duration: 1200,
        hold: 400 + index * 500,
        delay: 1400 + index * 1800,
        yoyo: true,
        repeat: -1,
        repeatDelay: 4200,
      });
    });
  }

  private setTimeLayer(layer: TimeLayer): void {
    const past = layer === 'past' || layer === 'subjective';
    this.memory?.setVisible(past);
    this.silhouettes.forEach((figure) => {
      figure.setFillStyle(layer === 'grave' ? 0x665b68 : 0x303438, 1);
    });
    this.scene?.cameras.main.setBackgroundColor(layer === 'grave' ? '#303235' : '#c0a86e');
  }
}
