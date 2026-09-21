const CACHE_NAME = "toeic-quickfire-v1";
const APP_FILES = ["./", "./index.html", "./styles.css", "./app.js", "./toeic_test.json", "./manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
});

self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});