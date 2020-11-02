var CACHE_NAME = "v1";
var urlsToCache = ["/p"];

self.addEventListener("install", function(event) {
	event.waitUntil(
		caches.open(CACHE_NAME).then(function(cache) {
			return cache.addAll(urlsToCache);
		})
	);
});

self.addEventListener("fetch", function(event) {
	event.respondWith(
		caches
			.match(event.request, { ignoreSearch: true })
			.then(function(response) {
				if (response) {
					return response;
				}
				return fetch(event.request);
			})
	);
});
