import 'phaser';
import ui from './assets/ui.png';
import tilemap from './assets/tilemap';
import tileset from './assets/tileset.png';
import pressStart2p from './assets/press-start-2p.bdf';
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
    this.load.image('ui', ui);
    this.load.image('tileset', tileset);
    this.load.bitmapFont('press-start-2p', pressStart2p.texture, pressStart2p.fontData);
    preloadArticles(this, articles.map(a => a.querySelector('img').src));
  }

  create() {
    this.cache.tilemap.add('tilemap', { format: Phaser.Tilemaps.Formats.TILED_JSON, data: tilemap });
    const map = this.add.tilemap('tilemap');
    map.addTilesetImage('tileset', 'tileset');
    this.map = map.createStaticLayer('main', 'tileset');
    this.map.y = 80;
    this.articles = articles.map((a, i) => createArticle(this, a, i));
    this.ui = this.add.nineslice(0, 0, this.map.width, 80, 'ui', [39, 70, 39, 70], 6);
    this.text = this.add.bitmapText(24, 32, 'press-start-2p', 'danilo neves cruz. game developer');

    this.scale.on('resize', this.layout, this);
    this.layout();

    const cursors = this.input.keyboard.createCursorKeys();
    this.controls = new Phaser.Cameras.Controls.FixedKeyControl({
      camera: this.cameras.main,
      left: cursors.left,
      right: cursors.right,
      up: cursors.up,
      down: cursors.down,
      speed: 0.2,
    });
  }

  layout(size = this.scale.gameSize) {
    const { width } = size;
    const scale = 2;
    this.map.setScale(scale);
    this.articles.forEach((article, i) => {
      article.layout(scale);
      article.setPosition(
        (48 + (i % 4) * (48 + 16)) * scale,
        80 + Math.floor(i / 4) * (64 + 16) * scale,
      );
    });
    this.ui.resize(this.map.displayWidth, 80);
    this.text.setScale(scale);
    this.cameras.main.setBounds(0, 0, this.map.displayWidth, this.map.displayHeight);
  }

  update(time, delta) {
    this.controls.update(delta);
  }
}

Scene.KEY = 'index';
