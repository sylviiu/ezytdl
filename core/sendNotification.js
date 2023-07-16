const { Notification } = require('electron');

const notifQueue = [];

module.exports = (content) => {
    console.log(`sending notification ${global.window ? true : false}`, content);

    if(content && !content.stack) {
        content.stack = `- ${new Error().stack.split(`\n`).slice(1).map(s => s.trim()).join(`\n- `)}`;
        content.stackType = `js`;
    } else if(content) content.stackType = `py`;

    if(!content) {
        console.log(`no content`, notifQueue)
        if(notifQueue.length > 0 && global.window) {
            console.log(`queue exists`)
            while(notifQueue.length > 0) {
                const c = notifQueue.shift();
                console.log(c)
                if(c.type != `error`) {
                    global.window.webContents.send(`notification`, c)
                }
            };
        }
    } else if(module.exports.systemNotificationsEnabled() && content.systemAllowed) {
        const notif = new Notification({ 
            title: (content.type ? `[${content.type.toUpperCase()}] ` : ``) + content.headingText, 
            body: content.bodyText,
            icon: content.icon || require(`./downloadIcon`).get(`active`, null, true),
        });
        notif.show();
        return true;
    } else if(!global.window || global.windowHidden) {
        notifQueue.push(content);
        return false;
    } else if(global.window && global.sendNotifs) {
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

module.exports.systemNotificationsEnabled = () => (!global.window || global.windowHidden || (global.window ? !global.window.focused : false))