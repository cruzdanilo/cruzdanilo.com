import 'phaser/src/gameobjects/image/ImageFactory';
import 'phaser/src/gameobjects/sprite/SpriteFactory';
import 'phaser/src/loader/LoaderPlugin';
import 'phaser/src/loader/filetypes/ImageFile';
import 'phaser/src/loader/filetypes/SpriteSheetFile';
import Container from 'phaser/src/gameobjects/container/Container';

import frame from '../assets/article-frame.png.cast5';

const articles = Object.freeze(Array.from(document.querySelectorAll('article')));
const FRAME_KEY = 'article-frame';

export default class Article extends Container {
  static preload(scene) {
    Article.loadFrame(scene);
    articles.map((a) => a.querySelector('img').src)
      .forEach((url, i) => scene.load.image(`article-${i}`, url));
  }

  static loadFrame(scene) {
    scene.load.spritesheet(FRAME_KEY, frame, { frameWidth: 48, frameHeight: 64 });
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
    scene.anims.remove('article-frame-idle');
    scene.anims.remove('article-frame-open');
  }

  static add(scene, i, x, y) {
    return scene.sys.displayList.add(new Article(scene, i, x, y));
  }

  static addAll(scene, points) {
    Article.createAnimations(scene);
    return articles.map((_, i) => Article.add(scene, points[i].x, points[i].y, `article-${i}`));
  }

  constructor(scene, x, y, key) {
    const image = scene.add.image(11, 11, key).setOrigin(0);
    const sprite = scene.add.sprite(0, 0, FRAME_KEY).setOrigin(0).play(`${FRAME_KEY}-idle`);
    image.setInteractive()
      .on('pointerdown', () => {})
      .on('pointerover', () => sprite
        .play(`${FRAME_KEY}-open`, false, sprite.anims.currentFrame.index))
      .on('pointerout', () => sprite
        .anims.playReverse(`${FRAME_KEY}-open`, false, sprite.anims.currentFrame.index)
        .anims.chain(`${FRAME_KEY}-idle`));
    super(scene, x, y, [image, sprite]);
    this.image = image;
    this.frame = sprite;
    this.setDepth(1);
    if (module.hot) this.hot();
  }

  layout(scale) {
    this.image.setPosition(11 * scale, 11 * scale);
    this.image.setScale(scale / 2);
    this.frame.setScale(scale);
  }

  hot() {
    module.hot.accept('../assets/article-frame.png.cast5', () => {
      this.scene.cache.image.remove(FRAME_KEY);
      Article.loadFrame(this.scene);
      this.scene.reload(() => {
        this.frame.destroy();
        this.createFrame();
      });
    });
  }
}
