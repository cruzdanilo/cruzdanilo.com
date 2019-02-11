import 'phaser';
import pressStart2p from './assets/press-start-2p.bdf';
import bg1 from './assets/bg-1.png';
import bg2 from './assets/bg-2.png';
import bg3 from './assets/bg-3.png';
import characters from './assets/characters.png';

function preload() {
  this.load.image('bg1', bg1);
  this.load.image('bg2', bg2);
  this.load.image('bg3', bg3);
  this.load.spritesheet('characters', characters, { frameWidth: 32, frameHeight: 32, endFrame: 72 });
}

let controls;

function create() {
  const { width, height } = this.sys.game.config;
  this.bg1 = this.add.tileSprite(0, 0, width, height, 'bg1').setOrigin(0).setScale(2).setScrollFactor(0);
  this.bg2 = this.add.tileSprite(0, 0, width, height, 'bg2').setOrigin(0).setScale(2).setScrollFactor(0);
  const level = [[0]];
  const map = this.make.tilemap({ data: level, tileWidth: 1009, tileHeight: height });
  const tiles = map.addTilesetImage('bg3');
  this.bg3 = map.createStaticLayer(0, tiles, 0, 0).setScale(2);
  const player = this.add.sprite(250, 144, 'characters').setOrigin(0).setScale(2).setScrollFactor(0);
  this.anims.create({
    key: 'walk',
    frames: this.anims.generateFrameNumbers('characters', { start: 0, end: 3 }),
    frameRate: 5,
    repeat: -1,
  });
  this.anims.create({
    key: 'hit',
    frames: this.anims.generateFrameNumbers('characters', { start: 8, end: 9 }),
    frameRate: 5,
    yoyo: true,
  });
  player.anims.play('walk');
  const camera = this.cameras.main;
  const cursors = this.input.keyboard.createCursorKeys();
  controls = new Phaser.Cameras.Controls.FixedKeyControl({
    camera,
    left: cursors.left,
    right: cursors.right,
    up: cursors.up,
    down: cursors.down,
    speed: 0.1,
  });
  camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
}

function update(time, delta) {
  controls.update(delta);
  this.bg1.tilePositionX = this.cameras.main.scrollX * 0.6;
  this.bg2.tilePositionX = this.cameras.main.scrollX * 0.8;
}

const config = {
  type: Phaser.AUTO,
  width: 400,
  height: 224,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoRound: true,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 200 } },
  },
  scene: { preload, create, update },
};

const game = new Phaser.Game(config);

// if (navigator.serviceWorker) navigator.serviceWorker.register('/service-worker.js');
// if (module.hot) module.hot.accept('./scene', () => cc.director.runScene(new Scene()));
