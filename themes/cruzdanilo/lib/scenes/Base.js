import 'phaser/src/cameras/2d/CameraManager';
import 'phaser/src/input/InputPlugin';
import 'phaser/src/input/keyboard/KeyboardPlugin';
import 'phaser/src/loader/LoaderPlugin';
import 'phaser/src/gameobjects/DisplayList';
import 'phaser/src/gameobjects/UpdateList';
import 'phaser/src/gameobjects/bitmaptext/static/BitmapTextFactory';
import 'phaser/src/loader/filetypes/BitmapFontFile';
import 'phaser/src/loader/filetypes/ImageFile';
import 'phaser/src/loader/filetypes/TilemapJSONFile';
import 'phaser/src/scene/ScenePlugin';
import 'phaser/src/tilemaps/TilemapFactory';
import COMPLETE_EVENT from 'phaser/src/loader/events/COMPLETE_EVENT';
import Scene from 'phaser/src/scene/Scene';
import FixedKeyControl from 'phaser/src/cameras/controls/FixedKeyControl';

import ui from '../assets/ui.png.cast5';
import dark from '../assets/dark.font.png.cast5';

const UI_HEIGHT = 80;

export default class Base extends Scene {
  constructor(config, mapSource, tilesets) {
    super(config);
    this.mapSource = mapSource;
    this.tilesets = tilesets;
    if (module.hot && this.hot) this.hot();
  }

  preload() {
    this.loadUI();
    this.loadMap();
  }

  create() {
    this.createMap();
    this.createUI();
    this.scale.on('resize', this.layout, this);
    this.layout();
    const cursors = this.input.keyboard.createCursorKeys();
    this.controls = new FixedKeyControl({
      camera: this.cameras.main,
      left: cursors.left,
      right: cursors.right,
      up: cursors.up,
      down: cursors.down,
      speed: 0.2,
    });
  }

  update(_time, delta) {
    this.controls.update(delta);
  }

  loadMap() {
    this.load.tilemapTiledJSON(this.sys.config, this.mapSource);
    Object.entries(this.tilesets).forEach(([name, file]) => this.load.image(name, file));
  }

  createMap() {
    this.map = this.add.tilemap(this.sys.config);
    Object.entries(this.tilesets).forEach(([name]) => this.map.addTilesetImage(name, name));
    this.map.layers.forEach(({ name }) => this.map.createStaticLayer(name, this.map.tilesets));
  }

  loadUI() {
    this.load.image('ui', ui);
    this.load.bitmapFont('dark', dark.texture, dark.fontData);
  }

  createUI() {
    this.ui = this.add.nineslice(0, 0, this.map.widthInPixels, UI_HEIGHT, 'ui', [39, 70, 39, 70], 6);
    this.text = this.add.bitmapText(24, 24, 'dark', 'DANILO NEVES CRUZ\nGAME DEVELOPER')
      .setTint(0xffb9000);
  }

  layout(size = this.scale.gameSize) {
    const scale = Math.max(2, Math.floor(size.width / this.map.widthInPixels));
    this.map.layers.forEach(({ tilemapLayer }) => {
      tilemapLayer.setPosition(0, UI_HEIGHT * scale);
      tilemapLayer.setScale(scale);
    });
    this.ui.setScale(scale);
    this.ui.resize(this.map.widthInPixels, UI_HEIGHT);
    this.text.setScale(scale);
    this.cameras.main.setBounds(0, 0,
      this.map.widthInPixels * scale, UI_HEIGHT + this.map.heightInPixels * scale);
  }

  refreshMap(mapSource, tilesets) {
    this.mapSource = mapSource;
    this.tilesets = tilesets;
    this.cache.tilemap.remove(this.sys.config);
    Object.keys(tilesets).forEach((name) => this.cache.image.remove(name));
    this.loadMap();
    this.reload(() => {
      this.map.destroy();
      this.createMap();
    });
  }

  refreshUI() {
    this.cache.image.remove('ui');
    this.cache.bitmapFont.remove('dark');
    this.load.image('ui', ui);
    this.load.bitmapFont('dark', dark.texture, dark.fontData);
    this.reload(() => {
      this.ui.destroy();
      this.text.destroy();
      this.createUI();
    });
  }

  reload(cb) {
    const handleComplete = () => {
      cb();
      this.layout();
      this.load.removeListener(COMPLETE_EVENT, handleComplete);
    };
    this.load.addListener(COMPLETE_EVENT, handleComplete);
    this.load.start();
  }

  hot() {
    module.hot.accept(['../assets/ui.png.cast5', '../assets/dark.font.png.cast5'],
      () => this.refreshUI());
  }
}
