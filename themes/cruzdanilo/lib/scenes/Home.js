import Base, { UI_HEIGHT } from './Base';
import Post from '../objects/Post';
import tilemap from '../assets/home.json';
import tileset from '../assets/home.png.cast5';

export default class Home extends Base {
  constructor() {
    super(Home.KEY, tilemap, { home: tileset });
  }

  preload() {
    super.preload();
    Post.preload(this);
  }

  create() {
    super.create();
    this.createPosts();
    this.layout();
  }

  createPosts() {
    this.posts = Post.addAll(this, this.map.objects.find((l) => l.name === 'posts').objects);
  }

  layout(...args) {
    const scale = super.layout(...args);
    this.posts.forEach((post, i) => {
      post.layout(scale);
      post.setPosition(
        (48 + (i % 4) * (48 + 16)) * scale,
        (UI_HEIGHT + Math.floor(i / 4) * (64 + 16)) * scale,
      );
    });
  }

  hot() {
    super.hot();
    module.hot.accept(['../assets/home.json', '../assets/home.png.cast5'],
      () => this.refreshMap(tilemap, { home: tileset }));
    module.hot.accept('../objects/Post', () => {
      Post.destroyAnimations(this);
      try { this.posts.forEach((post) => post.destroy()); } catch { /**/ }
      this.createPosts();
      this.layout();
    });
  }
}

Home.KEY = 'home';
