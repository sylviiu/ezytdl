const { Notification } = require('electron');

const notifQueue = [];

module.exports = (content) => {
    console.log(`sending notification ${global.window ? true : false} (queue: ${notifQueue.length})`, content);
    
    if(notifQueue.length > 0 && global.window && global.window.focused) {
        console.log(`queue exists`)
        while(notifQueue.length > 0) {
            const c = notifQueue.shift();
            console.log(c)
            global.window.webContents.send(`notification`, c)
            /*if(c.type != `error`) {
                global.window.webContents.send(`notification`, c)
            }*/
        };
    } else console.log(`queue doesn't exist`)

    if(content) {
        console.log(`content exists`);

        if(!content.stack) {
            content.stack = `- ${new Error().stack.split(`\n`).slice(1).map(s => s.trim()).join(`\n- `)}`;
            content.stackType = `js`;
        } else content.stackType = `py`;

        if(module.exports.windowHidden() && content.systemAllowed) {
            console.log(`sending system notification`)
            const notif = new Notification({ 
                title: (content.type ? `[${content.type.toUpperCase()}] ` : ``) + content.headingText, 
                body: content.bodyText,
                icon: content.icon || require(`./downloadIcon`).get(`active`, null, true),
            });
            notif.show();
            return true;
        } else if(module.exports.windowHidden() && !content.systemAllowed) {
            console.log(`window hidden, not sending notification -- adding to queue`)
            notifQueue.push(content);
            return false;
        } else if(global.window && global.sendNotifs && global.window.focused) {
            console.log(`sending notification`)
            global.window.webContents.send(`notification`, content);
            return true;
        } else {
            console.log(`window not focused, not sending notification -- adding to queue`)
            notifQueue.push(content);
            return false;
        }
    } else console.log(`content doesn't exist`)
}

module.exports.windowHidden = () => (!global.window || global.windowHidden || (global.window ? !global.window.focused : false))