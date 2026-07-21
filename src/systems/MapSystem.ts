import Phaser from 'phaser';

export interface MapTransition {
  targetMap: string;
  targetSpawn: string;
}

/**
 * 封装 Phaser Tilemap：加载 Tiled JSON、创建图层、读取对象层并查询地图出口。
 * 以后增加地图时只需注册 JSON，GameScene 无需了解具体 tile 布局。
 */
export class MapSystem {
  private tilemap?: Phaser.Tilemaps.Tilemap;
  private layers: Phaser.Tilemaps.TilemapLayer[] = [];
  private collisionLayer?: Phaser.Tilemaps.TilemapLayer;

  constructor(private readonly scene: Phaser.Scene) {}

  load(mapKey: string): Phaser.Tilemaps.TilemapLayer {
    this.destroyCurrentMap();

    const map = this.scene.make.tilemap({ key: mapKey });
    const tileset = map.addTilesetImage('terrain', 'terrain-tiles', 32, 32, 0, 0);
    if (!tileset) throw new Error(`地图 ${mapKey} 缺少 terrain tileset`);

    const ground = map.createLayer('Ground', tileset, 0, 0);
    const collision = map.createLayer('Collision', tileset, 0, 0);
    if (!ground || !collision) throw new Error(`地图 ${mapKey} 缺少 Ground 或 Collision 图层`);

    ground.setDepth(0);
    collision.setDepth(5).setCollisionByProperty({ collides: true });
    this.tilemap = map;
    this.layers = [ground, collision];
    this.collisionLayer = collision;

    this.scene.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.scene.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    return collision;
  }

  get widthInPixels(): number {
    return this.tilemap?.widthInPixels ?? 0;
  }

  get heightInPixels(): number {
    return this.tilemap?.heightInPixels ?? 0;
  }

  getObjects(layerName: string): Phaser.Types.Tilemaps.TiledObject[] {
    return this.tilemap?.getObjectLayer(layerName)?.objects ?? [];
  }

  getSpawn(name: string): Phaser.Math.Vector2 | null {
    const object = this.getObjects('Objects').find((candidate) =>
      candidate.type === 'spawn' && this.getProperty(candidate, 'name', candidate.name) === name,
    );
    return object ? new Phaser.Math.Vector2(object.x ?? 0, object.y ?? 0) : null;
  }

  findTransition(x: number, y: number): MapTransition | null {
    const object = this.getObjects('Events').find((candidate) =>
      candidate.type === 'map_transition' &&
      x >= (candidate.x ?? 0) &&
      x <= (candidate.x ?? 0) + (candidate.width ?? 0) &&
      y >= (candidate.y ?? 0) &&
      y <= (candidate.y ?? 0) + (candidate.height ?? 0),
    );
    if (!object) return null;

    return {
      targetMap: this.getProperty(object, 'targetMap', ''),
      targetSpawn: this.getProperty(object, 'targetSpawn', 'start'),
    };
  }

  getProperty<T>(object: Phaser.Types.Tilemaps.TiledObject, name: string, fallback: T): T {
    const properties = (object.properties ?? []) as Array<{ name: string; value: unknown }>;
    const property = properties.find((candidate) => candidate.name === name);
    return (property?.value as T | undefined) ?? fallback;
  }

  destroyCurrentMap(): void {
    this.layers.forEach((layer) => layer.destroy());
    this.layers = [];
    this.collisionLayer = undefined;
    this.tilemap?.destroy();
    this.tilemap = undefined;
  }
}
