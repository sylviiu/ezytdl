if(!document.getElementById(`loading`)) {
    notifications.handler((content) => createNotification(content));
    notifications.setReady();
}