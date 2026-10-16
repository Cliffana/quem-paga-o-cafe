/* Service Worker — permite instalar a app e funcionar offline.
   Estratégia: navegação = rede primeiro (para receber atualizações),
   restantes ficheiros do próprio site = cache primeiro.
   Pedidos a outros domínios (nuvem de dados) passam diretos. */

const CACHE = 'cafe-v6';
const FICHEIROS = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png'
];

self.addEventListener('install', (evento) => {
    evento.waitUntil(
        caches.open(CACHE)
            .then((c) => c.addAll(FICHEIROS).catch(() => {}))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (evento) => {
    evento.waitUntil(
        caches.keys()
            .then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (evento) => {
    const req = evento.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return; // deixa a nuvem (MantleDB) em paz

    if (req.mode === 'navigate') {
        evento.respondWith(
            fetch(req)
                .then((resp) => {
                    const copia = resp.clone();
                    caches.open(CACHE).then((c) => c.put('./index.html', copia)).catch(() => {});
                    return resp;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    evento.respondWith(
        caches.match(req).then((hit) => {
            if (hit) return hit;
            return fetch(req).then((resp) => {
                const copia = resp.clone();
                caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
                return resp;
            });
        })
    );
});
