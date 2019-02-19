import 'phaser';
import frame from './assets/article-frame.png';

export function preloadArticles(scene, images) {
  scene.load.spritesheet('article-frame', frame, { frameWidth: 48, frameHeight: 64 });
  images.forEach((url, i) => scene.load.image(`article-${i}`, url));
}

export function createArticle(scene, node, i) {
  if (!scene.anims.exists('article-frame-idle')) {
    scene.anims.create({
      key: 'article-frame-idle',
      frames: scene.anims.generateFrameNumbers('article-frame', { start: 0, end: 1 }),
      frameRate: 5,
      yoyo: true,
      repeat: -1,
      repeatDelay: 1000,
    });
    scene.anims.create({
      key: 'article-frame-open',
      frames: scene.anims.generateFrameNumbers('article-frame', { start: 0, end: 2 }),
      frameRate: 10,
    });
  }
  const image = scene.add.image(11, 11, `article-${i}`).setOrigin(0);
  const sprite = scene.add.sprite(0, 0, 'article-frame').setOrigin(0)
    .play('article-frame-idle');
  image.setInteractive()
    .on('pointerdown', () => {})
    .on('pointerover', () => sprite
      .play('article-frame-open', false, sprite.anims.currentFrame.index))
    .on('pointerout', () => sprite
      .anims.playReverse('article-frame-open', false, sprite.anims.currentFrame.index)
      .anims.chain('article-frame-idle'));
  const container = scene.add.container().add([image, sprite]);
  container.layout = (scale) => {
    image.setPosition(11 * scale, 11 * scale);
    image.setScale(scale / 2);
    sprite.setScale(scale);
  };
  return container;
}

export function cleanupArticles(scene) {
  scene.anims.remove('article-frame-idle');
  scene.anims.remove('article-frame-open');
}
