import cc from 'cocos2d-html5';
import cave from './assets/cave.png';
import characters from './assets/characters.png';
import pressStart2p from './assets/press-start-2p.bdf';

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

    this.title = new cc.LabelBMFont('danilo neves cruz', pressStart2p);
    this.title.setAnchorPoint(0.5, 1);
    this.title.setNormalizedPosition(0.5, 0.99);
    this.addChild(this.title);

    const text = new cc.LabelBMFont(`${this.width} x ${this.height}`, pressStart2p);
    text.setScale(2);
    text.setAnchorPoint(0.5, 1);
    text.setNormalizedPosition(0.5, 0.9);
    this.addChild(text);

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

  layout() {
    this.title.setScale(Math.min(4, Math.floor(this.width / this.title.width)));
  }

  update() {
    if (this.width !== cc.winSize.width || this.height !== cc.winSize.height) {
      this.setContentSize(cc.winSize);
      this.layout();
    }
  }
}
