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
