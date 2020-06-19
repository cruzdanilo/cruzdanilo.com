import ImageFile from 'phaser/src/loader/filetypes/ImageFile';
import SpriteSheetFile from 'phaser/src/loader/filetypes/SpriteSheetFile';
import Container from 'phaser/src/gameobjects/container/Container';
import Image from 'phaser/src/gameobjects/image/Image';
import Sprite from 'phaser/src/gameobjects/sprite/Sprite';

import frame from '../assets/post-frame.png.enc';

const FRAME_KEY = 'post-frame';

export default class Post extends Container {
  static preload(scene) {
    Post.loadFrame(scene);
    cruzdanilo.posts.forEach(({ path, cover }) => scene.load.addFile(new ImageFile(scene.load,
      path, `${path}${cover}`)));
  }

  static loadFrame(scene) {
    scene.load.addFile(new SpriteSheetFile(scene.load,
      FRAME_KEY, frame, { frameWidth: 48, frameHeight: 64 }));
  }

  static createAnimations(scene) {
    scene.anims.create({
      key: `${FRAME_KEY}-idle`,
      frames: scene.anims.generateFrameNumbers(FRAME_KEY, { start: 0, end: 1 }),
      frameRate: 5,
      yoyo: true,
      repeat: -1,
      repeatDelay: 1000,
    });
    scene.anims.create({
      key: `${FRAME_KEY}-open`,
      frames: scene.anims.generateFrameNumbers(FRAME_KEY, { start: 0, end: 2 }),
      frameRate: 10,
    });
  }

  static destroyAnimations(scene) {
    scene.anims.remove(`${FRAME_KEY}-idle`);
    scene.anims.remove(`${FRAME_KEY}-open`);
  }

  static add(scene, i, x, y) {
    return scene.sys.displayList.add(new Post(scene, i, x, y));
  }

  static addAll(scene, points) {
    Post.createAnimations(scene);
    return cruzdanilo.posts.map(({ path }, i) => Post.add(scene, points[i].x, points[i].y, path));
  }

  constructor(scene, x, y, key) {
    super(scene, x, y);
    if (module.hot) this.hot();
    this.createFrame();
    this.image = new Image(scene, 11, 11, key).setOrigin(0).setInteractive()
      .on('pointerdown', () => {})
      .on('pointerover', () => this.frame
        .play(`${FRAME_KEY}-open`, false, this.frame.anims.currentFrame.index))
      .on('pointerout', () => this.frame
        .anims.playReverse(`${FRAME_KEY}-open`, false, this.frame.anims.currentFrame.index)
        .anims.chain(`${FRAME_KEY}-idle`));
    this.add([this.image, this.frame]);
    this.setDepth(1);
  }

  createFrame() {
    this.frame = this.scene.sys.updateList.add(new Sprite(this.scene, 0, 0, FRAME_KEY)).setOrigin(0)
      .play(`${FRAME_KEY}-idle`);
  }

  layout(scale) {
    this.image.setPosition(11 * scale, 11 * scale);
    this.image.setScale(scale / 2);
    this.frame.setScale(scale);
  }

  hot() {
    module.hot.accept('../assets/post-frame.png.enc', () => {
      this.scene.cache.image.remove(FRAME_KEY);
      Post.loadFrame(this.scene);
      this.scene.reload(() => {
        try { this.frame.destroy(); } catch { /**/ }
        this.createFrame();
      });
    });
  }
}
