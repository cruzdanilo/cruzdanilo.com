import { ccui } from 'cocos2d-html5';
import pressStart2p from './assets/press-start-2p.bdf';
import uiBorder9 from './assets/ui-border9.png';

export default class Article extends ccui.RelativeBox {
  constructor(el) {
    super();
    this.setBackGroundImageScale9Enabled(true);
    const plist = uiBorder9.startsWith('#');
    this.setBackGroundImage(
      plist ? uiBorder9.slice(1) : uiBorder9,
      plist ? ccui.Widget.PLIST_TEXTURE : ccui.Widget.LOCAL_TEXTURE,
    );
    const layoutParameter = new ccui.LinearLayoutParameter();
    layoutParameter.setGravity(ccui.LinearLayoutParameter.CENTER_HORIZONTAL);
    layoutParameter.setMargin(1, 1, 1, 1);
    this.setLayoutParameter(layoutParameter);
    // eslint-disable-next-line no-underscore-dangle
    const borderSize = this._backGroundImage._spriteFrame.getOriginalSize();
    this.content = new ccui.LabelBMFont(el.textContent, pressStart2p);
    this.content.setPosition(borderSize.width / 3, borderSize.height / 3);
    this.addChild(this.content);
    this.content.getLayoutParameter().setAlign(ccui.RelativeLayoutParameter.CENTER_IN_PARENT);
    this.setContentSize(
      1 + this.content.width + borderSize.width / 3 * 2,
      1 + this.content.height + borderSize.height / 3 * 2,
    );
  }
}
