import { AUTO } from 'phaser/src/const';
import { RESIZE } from 'phaser/src/scale/const/SCALE_MODE_CONST';
import Game from 'phaser/src/core/Game';
import NineSlicePlugin from 'phaser3-nineslice/src/Plugin';

import Home from './scenes/Home';
import info from '../../../package.json';

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
  plugins: { global: [NineSlicePlugin.DefaultCfg] },
});

if (module.hot) {
  module.hot.accept();
  module.hot.dispose(() => game.destroy());
  module.hot.accept('./scenes/Home', () => {
    game.scene.remove(Home.KEY);
    game.scene.add(Home.KEY, Home, true);
  });
}
