import { clientsClaim, skipWaiting } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { initialize } from 'workbox-google-analytics';
import { NavigationRoute, registerRoute } from 'workbox-routing';

skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST); // eslint-disable-line no-underscore-dangle
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));
initialize();
