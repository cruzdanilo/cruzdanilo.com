import { subscribe } from 'webpack-hot-middleware/client?reload=true&path=/webpack.hmr'; // eslint-disable-line import/no-unresolved

subscribe(() => window.location.reload());
