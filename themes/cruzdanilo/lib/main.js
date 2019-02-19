import 'phaser';
import { Plugin as NineSlicePlugin } from 'phaser3-nineslice';
import Scene from './scene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 400,
  height: 224,
  pixelArt: true,
  scale: { mode: Phaser.Scale.RESIZE, autoRound: true },
  plugins: { global: [NineSlicePlugin.DefaultCfg] },
  scene: Scene,
});

// if (navigator.serviceWorker) navigator.serviceWorker.register('/service-worker.js');

if (module.hot) {
  module.hot.accept('./scene', () => {
    game.scene.remove(Scene.KEY);
    game.scene.add(Scene.KEY, Scene, true);
  });
}
