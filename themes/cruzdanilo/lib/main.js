import 'phaser/src/cameras/2d/CameraManager';
import 'phaser/src/gameobjects/DisplayList';
import 'phaser/src/gameobjects/UpdateList';
import 'phaser/src/input/InputPlugin';
import 'phaser/src/input/keyboard/KeyboardPlugin';
import 'phaser/src/loader/LoaderPlugin';
import 'phaser/src/scene/ScenePlugin';
import { Workbox } from 'workbox-window';
import { AUTO } from 'phaser/src/const';
import { RESIZE } from 'phaser/src/scale/const/SCALE_MODE_CONST';
import Game from 'phaser/src/core/Game';
import Features from 'phaser/src/device/Features';

import Home from './scenes/Home';
import info from '../../../package.json';

new Promise((resolve) => {
  const image = new Image();
  image.onerror = () => resolve(false);
  image.onload = () => resolve(!!image.width && !!image.height);
  image.src = 'data:image/webp;base64,UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAABQBAJ0BKgEAAQAAAP4AAA3AAP7mtQAAAA==';
}).catch(() => false).then((webp) => {
  Features.webp = webp;

  const game = new Game({
    title: info.name,
    version: info.version,
    url: info.homepage,
    scene: Home,
    type: AUTO,
    width: 400,
    height: 224,
    pixelArt: true,
    autoRound: true,
    scaleMode: RESIZE,
    disableContextMenu: true,
  });

  if (navigator.serviceWorker) {
    const wb = new Workbox(`/serviceWorker.js?webp=${webp}`);
    wb.addEventListener('activated', ({ isUpdate }) => { if (isUpdate) window.location.reload(); });
    wb.addEventListener('externalactivated', () => window.location.reload());
    wb.register();
  }

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => game.destroy(true));
    module.hot.accept('./scenes/Home', () => {
      game.scene.remove(Home.KEY);
      game.scene.add(Home.KEY, new Home(), true);
    });
  }
});
