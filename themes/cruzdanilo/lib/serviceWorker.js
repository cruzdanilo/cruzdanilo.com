import { clientsClaim, skipWaiting } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { initialize } from 'workbox-google-analytics';
import { NavigationRoute, registerRoute } from 'workbox-routing';

const webp = new URLSearchParams(self.location.search).get('webp') === 'true';
skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST.filter(({ url }) => ({
  webp, png: !webp, jpg: !webp, jpeg: !webp,
}[url.split('.').pop()] ?? true)));
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));
initialize();
