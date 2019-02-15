import 'phaser';
import frame from './assets/article-frame.png';

export function preloadArticles(scene, images) {
  scene.load.spritesheet('article-frame', frame, { frameWidth: 48, frameHeight: 64 });
  images.forEach((url, i) => scene.load.image(`article-${i}`, url));
}

export function createArticle(scene, node, i) {
  if (!scene.anims.exists('article-frame')) {
    scene.anims.create({
      key: 'article-frame',
      frames: scene.anims.generateFrameNumbers('article-frame', { start: 0, end: 1 }),
      frameRate: 1,
      yoyo: true,
      repeat: -1,
    });
  }
  return scene.add.container().add([
    scene.add.image(11 * 3, 11 * 3, `article-${i}`).setOrigin(0),
    scene.add.sprite(0, 0, 'article-frame').setOrigin(0).setScale(3).play('article-frame'),
  ]);
}

export function cleanupArticles(scene) {
  scene.anims.remove('article-frame');
}
