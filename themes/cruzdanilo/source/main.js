import cc from 'cocos2d-html5';

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

cc.game.run({
  id: 'canvas',
  debugMode: 1,
}, () => {
  cc.director.setProjection(cc.Director.PROJECTION_2D);
  updateSize();
  cc.view.setResizeCallback(updateSize);
  cc.view.resizeWithBrowserSize(true);
});
