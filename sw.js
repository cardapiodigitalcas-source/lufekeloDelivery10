const CACHE_NAME = "lufekelo-Delivery-v2";

const STATIC_ASSETS = [

    "./",
    "./index.html",
    "./manifest.json",

    "./icon-192.png",
    "./icon-512.png",

    "./assets/css/style.css",

    "./js/api.js",
    "./js/cart.js",
    "./js/main.js",

    "https://cdnjs.cloudflare.com/ajax/libs/node-vibrant/3.1.6/vibrant.min.js"

];



/* INSTALAÇÃO */
self.addEventListener("install", event => {

    self.skipWaiting();

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))

    );

});



/* ATIVAÇÃO */
self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys().then(keys => {

            return Promise.all(

                keys.map(key => {

                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }

                })

            );

        })

    );

    self.clients.claim();

});



/* FETCH INTELIGENTE */
self.addEventListener("fetch", event => {

    if (event.request.method !== "GET") return;

    event.respondWith(

        caches.match(event.request)
            .then(cached => {

                const networkFetch = fetch(event.request)
                    .then(response => {

                        const clone = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => cache.put(event.request, clone));

                        return response;

                    })
                    .catch(() => cached);

                return cached || networkFetch;

            })

    );

});
