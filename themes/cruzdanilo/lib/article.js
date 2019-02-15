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
      frameRate: 1,
      yoyo: true,
      repeat: -1,
    });
    scene.anims.create({
      key: 'article-frame-open',
      frames: scene.anims.generateFrameNumbers('article-frame', { start: 0, end: 2 }),
      frameRate: 10,
    });
  }
  const image = scene.add.image(11 * 2, 11 * 2, `article-${i}`).setOrigin(0);
  const sprite = scene.add.sprite(0, 0, 'article-frame').setOrigin(0).setScale(2)
    .play('article-frame-idle');
  image.setInteractive()
    .on('pointerdown', () => {})
    .on('pointerover', () => sprite
      .play('article-frame-open', false, sprite.anims.currentFrame.index))
    .on('pointerout', () => sprite
      .anims.playReverse('article-frame-open', false, sprite.anims.currentFrame.index)
      .anims.chain('article-frame-idle'));
  return scene.add.container().add([image, sprite]);
}

export function cleanupArticles(scene) {
  scene.anims.remove('article-frame-idle');
  scene.anims.remove('article-frame-open');
}
