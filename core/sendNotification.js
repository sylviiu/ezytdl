const { Notification } = require('electron');

const notifQueue = [];

module.exports = (content) => {
    console.log(`sending notification ${global.window ? true : false}`, content);

    if((!global.window || global.windowHidden) && content.systemAllowed) {
        const notif = new Notification({ title: (content.type ? `[${content.type.toUpperCase()}] ` : ``) + content.headingText, body: content.bodyText });
        notif.show();
        return true;
    } else if(!global.window || global.windowHidden) {
        notifQueue.push(content);
        return false;
    } else if(global.window) {
        while(notifQueue.length > 0) {
            const c = notifQueue.shift();
            global.window.webContents.send(`notification`, c)
        };
        global.window.webContents.send(`notification`, content);
        return true;
    } else {
        notifQueue.push(content);
        return false;
    }
}