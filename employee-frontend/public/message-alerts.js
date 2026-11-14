self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
        const client = clients[0];
        if (client) {
            await client.navigate('/chat');
            return client.focus();
        }
        return self.clients.openWindow('/chat');
    }));
});
