/* global articles */
import 'phaser';
import { preloadArticles, createArticle, cleanupArticles } from './article';

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
    preloadArticles(this, articles.map(a => a.querySelector('img').src));
  }

  create() {
    articles.forEach((a, i) => createArticle(this, a, i).setPosition(i * 48 * 3, 0));
    const camera = this.cameras.main;
    const cursors = this.input.keyboard.createCursorKeys();
    this.controls = new Phaser.Cameras.Controls.FixedKeyControl({
      camera,
      left: cursors.left,
      right: cursors.right,
      up: cursors.up,
      down: cursors.down,
      speed: 0.2,
    });
    camera.setBounds(0, 0, articles.length * 48 * 3, 64 * 3);
  }

  update(time, delta) {
    this.controls.update(delta);
  }
}

Scene.KEY = 'index';
