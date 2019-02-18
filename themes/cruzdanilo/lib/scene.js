import 'phaser';
import tilemap from './assets/tilemap';
import tileset from './assets/tileset.png';
import { preloadArticles, createArticle, cleanupArticles } from './article';

const articles = [...document.getElementsByTagName('article')];

export default class Scene extends Phaser.Scene {
  constructor() {
    super(Scene.KEY);
    const scene = this;
    if (module.hot) {
      module.hot.accept('./article', () => {
        cleanupArticles(scene);
        scene.scene.restart();
      });
    }
  }

  preload() {
    this.load.image('tileset', tileset);
    preloadArticles(this, articles.map(a => a.querySelector('img').src));
  }

  create() {
    this.cache.tilemap.add('tilemap', { format: Phaser.Tilemaps.Formats.TILED_JSON, data: tilemap });
    const map = this.add.tilemap('tilemap');
    map.addTilesetImage('tileset', 'tileset');
    this.map = map.createStaticLayer('main', 'tileset');
    this.articles = articles.map((a, i) => createArticle(this, a, i));
    const cursors = this.input.keyboard.createCursorKeys();
    this.controls = new Phaser.Cameras.Controls.FixedKeyControl({
      camera: this.cameras.main,
      left: cursors.left,
      right: cursors.right,
      up: cursors.up,
      down: cursors.down,
      speed: 0.2,
    });
    this.scale.on('resize', this.layout, this);
    this.layout();
  }

  layout(size = this.scale.gameSize) {
    const { width } = size;
    const scale = 2;
    this.map.setScale(scale);
    this.articles.forEach((article, i) => {
      article.layout(scale);
      article.setPosition(
        (48 + (i % 4) * (48 + 16)) * scale,
        Math.floor(i / 4) * (64 + 16) * scale,
      );
    });
    this.cameras.main.setBounds(0, 0, this.map.displayWidth, this.map.displayHeight);
  }

  update(time, delta) {
    this.controls.update(delta);
  }
}

Scene.KEY = 'index';
