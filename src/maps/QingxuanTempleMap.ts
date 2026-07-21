import Phaser from 'phaser';

export interface ProceduralMapRuntime {
  key: string;
  name: string;
  width: number;
  height: number;
  obstacles: Phaser.Physics.Arcade.StaticGroup;
  spawn: Phaser.Math.Vector2;
}

/**
 * 第一章青玄观 Graphics 测试地图。
 * 地图生命周期独立于 GameScene；后续可用实现相同运行时接口的 Tiled provider 替换。
 */
export class QingxuanTempleMap {
  readonly key = 'qingxuan_temple';
  readonly name = '第一章 · 尸解山 · 青玄观';
  readonly width = 1280;
  readonly height = 960;
  private graphics?: Phaser.GameObjects.Graphics;
  private obstacles?: Phaser.Physics.Arcade.StaticGroup;
  private mist: Phaser.GameObjects.Ellipse[] = [];

  create(scene: Phaser.Scene): ProceduralMapRuntime {
    const g = scene.add.graphics().setDepth(0);
    this.graphics = g;
    this.drawGround(g);
    this.drawStoneSteps(g);
    this.drawMountainGate(g);
    this.drawTemple(g);
    this.drawIncenseBurner(g);
    this.drawBamboo(g);
    this.drawGraveyard(g);
    this.createMist(scene);
    scene.add.text(640, 603, '青 玄 观', {
      fontFamily: 'STKaiti, KaiTi, serif', fontSize: '17px', color: '#a68e68',
    }).setOrigin(0.5).setDepth(2);

    const obstacles = scene.physics.add.staticGroup();
    this.obstacles = obstacles;
    const addObstacle = (x: number, y: number, width: number, height: number): void => {
      const body = obstacles.create(x, y, 'terrain-tiles') as Phaser.Physics.Arcade.Image;
      body.setDisplaySize(width, height).setVisible(false).refreshBody();
    };

    // 世界边界、道观主体、竹林、墓碑与香炉碰撞。
    addObstacle(this.width / 2, 8, this.width, 16);
    addObstacle(this.width / 2, this.height - 8, this.width, 16);
    addObstacle(8, this.height / 2, 16, this.height);
    addObstacle(this.width - 8, this.height / 2, 16, this.height);
    addObstacle(640, 250, 470, 230);
    addObstacle(640, 570, 76, 48);
    addObstacle(185, 430, 220, 580);
    addObstacle(1090, 415, 235, 420);
    [[880, 470], [970, 500], [1050, 545], [900, 590], [1015, 645]].forEach(([x, y]) =>
      addObstacle(x, y, 30, 46),
    );

    scene.physics.world.setBounds(0, 0, this.width, this.height);
    scene.cameras.main.setBounds(0, 0, this.width, this.height);
    return {
      key: this.key,
      name: this.name,
      width: this.width,
      height: this.height,
      obstacles,
      spawn: new Phaser.Math.Vector2(640, 865),
    };
  }

  destroy(): void {
    this.mist.forEach((object) => object.destroy());
    this.mist = [];
    this.obstacles?.clear(true, true);
    this.obstacles = undefined;
    this.graphics?.destroy();
    this.graphics = undefined;
  }

  private drawGround(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x111712).fillRect(0, 0, this.width, this.height);
    g.fillStyle(0x182019);
    for (let y = 0; y < this.height; y += 46) {
      for (let x = (y / 46) % 2 ? 18 : 0; x < this.width; x += 64) {
        g.fillCircle(x, y, 2 + ((x + y) % 3));
      }
    }
    g.fillStyle(0x0b0f0c).fillTriangle(0, 0, 420, 0, 0, 690);
    g.fillTriangle(this.width, 0, 860, 0, this.width, 720);
  }

  private drawStoneSteps(g: Phaser.GameObjects.Graphics): void {
    for (let index = 0; index < 13; index += 1) {
      const y = 910 - index * 27;
      const width = 230 - index * 4;
      g.fillStyle(index % 2 ? 0x4b4a42 : 0x555349).fillRect(640 - width / 2, y, width, 19);
      g.lineStyle(1, 0x272923).lineBetween(640 - width / 2, y + 18, 640 + width / 2, y + 18);
    }
  }

  private drawMountainGate(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x332822).fillRect(500, 595, 30, 150).fillRect(750, 595, 30, 150);
    g.fillStyle(0x211817).fillTriangle(455, 620, 640, 550, 825, 620).fillRect(485, 600, 310, 24);
    g.fillStyle(0x9d8d6b).fillRect(574, 590, 132, 38);
    g.fillStyle(0x2c211c).fillRect(580, 596, 120, 26);
  }

  private drawTemple(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x342d27).fillRect(415, 178, 450, 205);
    g.fillStyle(0x1e1716).fillTriangle(350, 205, 640, 85, 930, 205).fillRect(380, 185, 520, 48);
    g.fillStyle(0x5d1b17).fillRect(455, 225, 24, 158).fillRect(801, 225, 24, 158);
    g.fillStyle(0x151211).fillRect(575, 238, 130, 145);
    g.fillStyle(0x6d5c41).fillRect(613, 250, 54, 80);
    g.lineStyle(3, 0x281816).strokeRect(613, 250, 54, 80);
    g.fillStyle(0x791b17).fillCircle(640, 290, 7);
    g.lineStyle(4, 0x171312).lineBetween(430, 332, 512, 290).lineBetween(770, 292, 850, 340);
  }

  private drawIncenseBurner(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x47473f).fillEllipse(640, 552, 76, 32).fillRect(611, 550, 58, 41);
    g.fillTriangle(615, 582, 625, 582, 612, 610).fillTriangle(655, 582, 666, 582, 669, 610);
    g.fillStyle(0x9b301e).fillRect(630, 506, 3, 47).fillRect(640, 498, 3, 55).fillRect(650, 510, 3, 43);
  }

  private drawBamboo(g: Phaser.GameObjects.Graphics): void {
    for (let index = 0; index < 20; index += 1) {
      const x = 70 + (index % 5) * 58 + Math.sin(index) * 18;
      const y = 170 + Math.floor(index / 5) * 165;
      g.lineStyle(7, 0x2d4832).lineBetween(x, y + 130, x + 8, y);
      g.lineStyle(2, 0x536848).lineBetween(x - 2, y + 55, x + 32, y + 28);
      g.fillStyle(0x304d35).fillEllipse(x + 38, y + 25, 46, 12).fillEllipse(x - 13, y + 67, 42, 11);
    }
  }

  private drawGraveyard(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x171b17).fillRect(835, 385, 330, 345);
    [[880, 470], [970, 500], [1050, 545], [900, 590], [1015, 645]].forEach(([x, y], index) => {
      g.fillStyle(index === 3 ? 0x595348 : 0x45453f).fillRoundedRect(x - 14, y - 40, 28, 46, 4);
      g.fillStyle(0x241c18).fillRect(x - 2, y - 30, 4, 19);
      g.lineStyle(1, 0x73624d).strokeLineShape(new Phaser.Geom.Line(x - 7, y - 7, x + 7, y - 7));
    });
    g.fillStyle(0x2b211d).fillRect(1080, 680, 100, 42);
  }

  private createMist(scene: Phaser.Scene): void {
    for (let index = 0; index < 10; index += 1) {
      const mist = scene.add.ellipse(index * 145 - 80, 150 + (index % 4) * 190, 260, 42, 0xb5b09f, 0.035)
        .setDepth(700);
      this.mist.push(mist);
      scene.tweens.add({ targets: mist, x: `+=${180 + index * 8}`, duration: 9000 + index * 500, yoyo: true, repeat: -1 });
    }
  }
}
