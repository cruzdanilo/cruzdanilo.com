import BitmapText from 'phaser/src/gameobjects/bitmaptext/static/BitmapText';
import BitmapFontFile from 'phaser/src/loader/filetypes/BitmapFontFile';
import Container from 'phaser/src/gameobjects/container/Container';
import Features from 'phaser/src/device/Features';
import FixedKeyControl from 'phaser/src/cameras/controls/FixedKeyControl';
import ImageFile from 'phaser/src/loader/filetypes/ImageFile';
import NineSlice from 'phaser3-nineslice/src/NineSlice';
import ParseToTilemap from 'phaser/src/tilemaps/ParseToTilemap';
import Scene from 'phaser/src/scene/Scene';
import TilemapJSONFile from 'phaser/src/loader/filetypes/TilemapJSONFile';
import COMPLETE_EVENT from 'phaser/src/loader/events/COMPLETE_EVENT';

import dark from '../assets/dark.font.png.enc';
import ui from '../assets/ui.png.enc';

export const UI_HEIGHT = 80;

export default class Base extends Scene {
  constructor(config, mapSource, tilesets) {
    super(config);
    this.mapSource = mapSource;
    this.tilesets = tilesets;
    if (module.hot) this.hot();
  }

  preload() {
    this.loadUI();
    this.loadMap();
  }

  create() {
    this.createMap();
    this.createUI();
    this.scale.on('resize', this.layout, this);
    const {
      left, right, up, down,
    } = this.input.keyboard.createCursorKeys();
    this.controls = new FixedKeyControl({
      left, right, up, down, speed: 0.2, camera: this.cameras.main,
    });
  }

  update(_time, delta) {
    this.controls.update(delta);
  }

  loadMap() {
    this.load.addFile(new TilemapJSONFile(this.load, this.sys.config, this.mapSource));
    Object.entries(this.tilesets).forEach(([name, file]) => this.load
      .addFile(new ImageFile(this.load, name, file[Number(Features.webp)])));
  }

  loadUI() {
    this.load.addFile(new ImageFile(this.load, 'ui', ui[Number(Features.webp)]));
    this.load.addFile(new BitmapFontFile(this.load, 'dark',
      dark.textures[Number(Features.webp)], dark.fontData).files);
  }

  createMap() {
    this.map = ParseToTilemap(this, this.sys.config);
    this.map.tilesets = this.map.tilesets.filter(({ name }) => name in this.tilesets);
    this.map.tilesets.forEach(({ name }) => this.map.addTilesetImage(name, name));
    this.stage = this.children.add(new Container(this, 0, UI_HEIGHT));
    this.stage.add(this.map.layers
      .map(({ name }) => this.map.createStaticLayer(name, this.map.tilesets)));
    if (!this.map.imageCollections) return;
    this.stage.add(this.map.imageCollections.flatMap(({ name: key, images }) => images
      .flatMap(({ gid, image: frame }) => this.map.objects
        .flatMap(({ name }) => this.map.createFromObjects(name, gid, { key, frame })))));
  }

  createUI() {
    this.ui = this.children.add(new NineSlice(this,
      { sourceKey: 'ui', sourceLayout: { width: 70, height: 39 } },
      { width: this.map.widthInPixels, height: UI_HEIGHT }));
    this.text = this.children.add(new BitmapText(this,
      24, 24, 'dark', 'DANILO NEVES CRUZ\nGAME DEVELOPER')).setTint(0xffb9000);
  }

  layout(size = this.scale.gameSize) {
    const scale = Math.max(2, Math.floor(size.width / this.map.widthInPixels));
    this.stage.setPosition(0, UI_HEIGHT * scale);
    this.stage.setScale(scale);
    this.ui.setScale(scale);
    this.ui.resize(this.map.widthInPixels, UI_HEIGHT);
    this.text.setScale(scale);
    this.cameras.main.setBounds(0, 0,
      this.map.widthInPixels * scale, UI_HEIGHT + this.map.heightInPixels * scale);
    return scale;
  }

  refreshMap(mapSource, tilesets) {
    this.mapSource = mapSource;
    this.tilesets = tilesets;
    this.cache.tilemap.remove(this.sys.config);
    Object.keys(tilesets).forEach((name) => this.textures.remove(name));
    this.loadMap();
    this.reload(() => {
      this.stage.destroy();
      this.createMap();
    });
  }

  refreshUI() {
    this.textures.remove('ui');
    this.cache.bitmapFont.remove('dark');
    this.loadUI();
    this.reload(() => {
      try { this.ui.destroy(); } catch { /**/ }
      try { this.text.destroy(); } catch { /**/ }
      this.createUI();
    });
  }

  reload(callback) {
    this.load.once(COMPLETE_EVENT, () => { callback(); this.layout(); });
    this.load.start();
  }

  hot() {
    module.hot.accept(['../assets/ui.png.enc', '../assets/dark.font.png.enc'],
      () => this.refreshUI());
  }
}
