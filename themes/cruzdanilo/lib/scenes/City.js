import Base, { UI_HEIGHT } from './Base';
import Post from '../objects/Post';
import tilemap from '../assets/city/city.json';
import tileset from '../assets/city/city.png.enc';

export default class City extends Base {
  constructor() {
    super(City.KEY, tilemap, { city: tileset });
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
      post.setPosition((48 + (i % 4) * (48 + 16)) * scale,
        (UI_HEIGHT + Math.floor(i / 4) * (64 + 16)) * scale);
    });
  }

  hot() {
    super.hot();
    module.hot.accept(['../assets/city/city.json', '../assets/city/city.png.enc'],
      () => this.refreshMap(tilemap, { city: tileset }));
    module.hot.accept('../objects/Post', () => {
      Post.destroyAnimations(this);
      try { this.posts.forEach((post) => post.destroy()); } catch { /**/ }
      this.createPosts();
      this.layout();
    });
  }
}

City.KEY = 'city';
