/* global articles */
import { cc, ccui } from 'cocos2d-html5';
import cave from './assets/cave.png';
import characters from './assets/characters.png';
import pressStart2p from './assets/press-start-2p.bdf';
import Article from './article';

export default class Scene extends cc.Scene {
  constructor() {
    super();

    const caveSprite = new cc.Sprite(cave);
    const caveRect = caveSprite.getTextureRect();
    const caveFrame = new cc.SpriteFrame(
      caveSprite.getTexture(),
      cc.rect(caveRect.x + 0, caveRect.y + 144, 32, 32),
    );
    for (let i = 0; i < 16; i += 1) {
      for (let j = 0; j < 16; j += 1) {
        const tile = new cc.Sprite(caveFrame);
        tile.setScale(2);
        tile.setAnchorPoint(0, 0);
        tile.setPosition(i * 32 * 2, j * 32 * 2);
        this.addChild(tile);
      }
    }

    this.player = new cc.Sprite(characters);
    this.player.setScale(2);
    this.player.setAnchorPoint(0.5, 0);
    this.player.setNormalizedPosition(0.5, 0.5);
    this.addChild(this.player);
    const animation = new cc.Animation();
    animation.setDelayPerUnit(0.15);
    const rect = this.player.getTextureRect();
    for (let i = 0; i < 4; i += 1) {
      animation.addSpriteFrameWithTexture(
        this.player.getTexture(),
        cc.rect(rect.x + (i * 32) + 8, rect.y + 32 + 8, 16, 24),
      );
    }
    this.player.setSpriteFrame(animation.getFrames()[0].getSpriteFrame());
    this.player.runAction(cc.animate(animation).repeatForever());

    this.ui = new ccui.VBox();
    this.addChild(this.ui);

    const layoutParameter = new ccui.LinearLayoutParameter();
    layoutParameter.setGravity(ccui.LinearLayoutParameter.CENTER_HORIZONTAL);
    layoutParameter.setMargin(1, 1, 1, 1);

    this.title = new ccui.LabelBMFont('danilo neves cruz', pressStart2p);
    this.title.setLayoutParameter(layoutParameter);
    this.ui.addChild(this.title);

    const text = new ccui.LabelBMFont(`${this.width} x ${this.height}`, pressStart2p);
    text.setLayoutParameter(layoutParameter);
    this.ui.addChild(text);

    this.articles = new ccui.VBox();
    this.ui.addChild(this.articles);
    this.articles.getLayoutParameter().setGravity(ccui.LinearLayoutParameter.CENTER_HORIZONTAL);
    this.loadArticles();

    this.layout();

    cc.eventManager.addListener({
      event: cc.EventListener.TOUCH_ONE_BY_ONE,
      onTouchBegan: () => true,
      onTouchEnded: (touch) => {
        const tag = 'move';
        const to = this.convertTouchToNodeSpace(touch);
        const action = cc.moveTo(cc.pDistance(this.player.getPosition(), to) / 200, to);
        action.setTag(tag);
        this.player.stopActionByTag(tag);
        this.player.runAction(action);
      },
    }, this);

    this.scheduleUpdate();
  }

  loadArticles() {
    this.articles.removeAllChildren();
    articles.forEach((el) => {
      const article = new Article(el);
      this.articles.addChild(article);
    });
  }

  layout() {
    const scale = Math.min(2, Math.floor(this.width / 300));
    this.ui.setScale(scale);
    this.ui.setContentSize(this.width / scale, this.height / scale);
  }

  update() {
    if (this.width !== cc.winSize.width || this.height !== cc.winSize.height) {
      this.setContentSize(cc.winSize);
      this.layout();
    }
  }
}

if (module.hot) module.hot.accept('./article', () => cc.director.getRunningScene().loadArticles());
