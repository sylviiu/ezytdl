const notifQueue = [];

module.exports = (content) => {
    console.log(`sending notification ${global.window ? true : false}`, content);

    if(!global.window) {
        notifQueue.push(content);
        return false;
    } else {
        while(notifQueue.length > 0) {
            const c = notifQueue.shift();
            global.window.webContents.send(`notification`, c)
        };
        global.window.webContents.send(`notification`, content);
        return true;
    }
}