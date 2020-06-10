import { clientsClaim, skipWaiting } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { initialize } from 'workbox-google-analytics';

skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST); // eslint-disable-line no-underscore-dangle
cleanupOutdatedCaches();
initialize();
