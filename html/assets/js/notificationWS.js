if(!document.getElementById(`loading`)) {
    const notificationWS = new WebSocket('ws://localhost:3000/download');

    notificationWS.onopen = () => notificationWS.send(`notification`)

    notificationWS.onmessage = (e) => createNotification(JSON.parse(e.data))
}