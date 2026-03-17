const CACHE = 'homeschool-lms-v21';
const ASSETS = [
  './',
  './index.html',
  './manifest.json?v=4',
  './parent-dashboard/index.html',
  './arcade/bridge-demo.html',
  './css/app.css?v=4',
  './js/app.js?v=16',
  './js/world.js?v=10',
  './data/curriculum.js?v=6',
  './data/arcade-games.js?v=2',
  './lib/three.min.js',
  './lib/GLTFLoader.js',
  './models/textures/colormap.png',
  './models/buildings/bldg_afr.glb',
  './models/buildings/bldg_arcade.glb',
  './models/buildings/bldg_english.glb',
  './models/buildings/bldg_home.glb',
  './models/buildings/bldg_home_alt.glb',
  './models/buildings/bldg_life.glb',
  './models/buildings/bldg_math.glb',
  './models/buildings/bldg_science.glb',
  './models/buildings/bldg_social.glb',
  './models/buildings/detail_awning.glb',
  './models/buildings/detail_parasol.glb',
  './models/car/vehicle_monster_truck.glb',
  './models/car/wheel_large.glb',
  './models/details/detail_driveway.glb',
  './models/details/detail_fence.glb',
  './models/details/detail_path.glb',
  './models/details/detail_planter.glb',
  './models/nature/bush.glb',
  './models/nature/bush_small.glb',
  './models/nature/campfire.glb',
  './models/nature/cliff.glb',
  './models/nature/cliff_large.glb',
  './models/nature/flower_purple.glb',
  './models/nature/flower_yellow.glb',
  './models/nature/grass.glb',
  './models/nature/rock_large.glb',
  './models/nature/rock_small.glb',
  './models/nature/sign.glb',
  './models/nature/tent.glb',
  './models/nature/tree_cone.glb',
  './models/nature/tree_fat.glb',
  './models/nature/tree_oak.glb',
  './models/nature/tree_palm.glb',
  './models/nature/tree_plateau.glb',
  './models/nature/tree_round.glb',
  './models/nature/tree_suburb_large.glb',
  './models/nature/tree_suburb_small.glb',
  './models/roads/road_bend.glb',
  './models/roads/road_corner.glb',
  './models/roads/road_crossing.glb',
  './models/roads/road_curve.glb',
  './models/roads/road_straight.glb',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const requestUrl = new URL(e.request.url);
  const isNavigation = e.request.mode === 'navigate';
  const isSameOrigin = requestUrl.origin === self.location.origin;

  if (isNavigation) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(requestUrl.pathname, copy));
          return response;
        })
        .catch(() => caches.match(requestUrl.pathname).then(match => match || caches.match('./index.html')))
    );
    return;
  }

  if (!isSameOrigin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, copy));
        return response;
      });
    })
  );
});
