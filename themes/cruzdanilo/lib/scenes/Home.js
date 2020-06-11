import Base, { UI_HEIGHT } from './Base';
import Article from '../objects/Article';
import tilemap from '../assets/home.json';
import tileset from '../assets/home.png.cast5';

export default class Home extends Base {
  constructor() {
    super(Home.KEY, tilemap, { home: tileset });
  }

  preload() {
    super.preload();
    Article.preload(this);
  }

  create() {
    super.create();
    this.createArticles();
    this.layout();
  }

  createArticles() {
    this.articles = Article.addAll(this, this.map.objects.find((l) => l.name === 'articles').objects);
  }

  layout(...args) {
    const scale = super.layout(...args);
    this.articles.forEach((article, i) => {
      article.layout(scale);
      article.setPosition(
        (48 + (i % 4) * (48 + 16)) * scale,
        (UI_HEIGHT + Math.floor(i / 4) * (64 + 16)) * scale,
      );
    });
  }

  hot() {
    super.hot();
    module.hot.accept(['../assets/home.json', '../assets/home.png.cast5'],
      () => this.refreshMap(tilemap, { home: tileset }));
    module.hot.accept('../objects/Article', () => {
      Article.destroyAnimations(this);
      this.articles.forEach((article) => article.destroy());
      this.createArticles();
      this.layout();
    });
  }
}

Home.KEY = 'home';
