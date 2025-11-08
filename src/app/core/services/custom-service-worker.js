self.addEventListener('sync', event => {
  if (event.tag === 'fieldflow-sync') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'FIELD_FLOW_SYNC', tag: event.tag });
        });
      })
    );
  }
});

self.addEventListener('periodicsync', event => {
  if (event.tag === 'fieldflow-periodic') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'FIELD_FLOW_SYNC', tag: event.tag });
        });
      })
    );
  }
});
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.notification?.title || 'Notification';
  const options = {
    body: data.notification?.body || '',
    icon: data.notification?.icon || '/assets/icons/icon-192x192.png',
    data: data.data || {}
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

