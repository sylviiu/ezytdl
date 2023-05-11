const notificationWS = new WebSocket('ws://localhost:8080/download');

notificationWS.onopen = () => {
    notificationWS.send(`notification`)
}

notificationWS.onmessage = (e) => createNotification(JSON.parse(e.data))