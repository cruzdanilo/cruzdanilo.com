import Base from './Base';
import tilemap from '../assets/home.json';
import tileset from '../assets/home.png.cast5';

export default class Home extends Base {
  constructor() {
    super(Home.KEY, tilemap, { home: tileset });
  }

  hot() {
    super.hot();
    module.hot.accept(['../assets/home.json', '../assets/home.png.cast5'],
      () => this.refreshMap(tilemap, { home: tileset }));
  }
}

Home.KEY = 'home';
