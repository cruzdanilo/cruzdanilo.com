/* global atlases */
import cc from 'cocos2d-html5';
import pressStart2p from './assets/press-start-2p.bdf';
import Scene from './scene';

function updateSize() {
  const size = cc.view.getFrameSize();
  cc.view.setDesignResolutionSize(size.width, size.height, cc.ResolutionPolicy.EXACT_FIT);
}

function setupPixelPerfectRendering() {
  /* eslint-disable no-underscore-dangle */
  Object.values(cc.textureCache._textures).forEach(t => t.setAliasTexParameters());
  cc.Node.RenderCmd.prototype.originTransform = function transform(parentCmd, recursive) {
    cc.Node.RenderCmd.prototype.transform.call(this, parentCmd, recursive);
    const wt = this._worldTransform;
    wt.tx = Math.round(wt.tx);
    wt.ty = Math.round(wt.ty);
  };
  /* eslint-enable no-underscore-dangle */
}

if (navigator.serviceWorker) navigator.serviceWorker.register('/service-worker.js');
cc.game.run({
  id: 'body',
  debugMode: 1, // DEBUG
}, () => {
  cc.director.setProjection(cc.Director.PROJECTION_2D);
  updateSize();
  cc.view.setResizeCallback(updateSize);
  cc.view.resizeWithBrowserSize(true);
  cc.loader.load([...atlases.reduce((files, atlas) => {
    files.push(...Object.values(atlas));
    return files;
  }, []), pressStart2p], () => {
    atlases.forEach(atlas => cc.spriteFrameCache.addSpriteFrames(atlas.plist));
    setupPixelPerfectRendering();
    cc.director.runScene(new Scene());
  });
});

if (module.hot) module.hot.accept('./scene', () => cc.director.runScene(new Scene()));
