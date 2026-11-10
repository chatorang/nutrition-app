// オフライン起動用の Service Worker（ライブラリなしの最小構成）。
// 画面(HTML)は「まず通信、だめならキャッシュ」。更新がすぐ反映されるようにするため。
// それ以外の同一オリジンのファイル(JS/CSS/画像/食品データ)は「まずキャッシュ、なければ通信」。
// ビルドのたびにファイル名が変わるので、古いキャッシュが使われ続けることはない。
const CACHE = 'eiyo-note-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// 初回起動のとき、この Service Worker が動き出す前に読み込まれたファイルを、画面側から教えてもらって保存する。
// これで「一度開けば、次からはオフラインでも起動できる」状態になる。
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'cache-urls') return;
  const urls = event.data.urls.filter((u) => new URL(u).origin === self.location.origin);
  event.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(urls.map((u) => c.add(u)))));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  const put = (res) => {
    if (res.ok) {
      const copy = res.clone(); // 複製は返す前に同期で行う（後からだと本文が消費済みで失敗する）
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  };

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(put).catch(() => caches.match(req).then((hit) => hit || caches.match('./'))));
    return;
  }
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(put)));
});
