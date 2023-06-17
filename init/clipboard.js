const { clipboard, Notification } = require('electron');
const sendNotification = require('../core/sendNotification');
const genericUrlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

let started = false;

const start = () => new Promise(async r => {
    if(!started) {
        started = true;

        let lastText = null;

        while(true) await new Promise(async res => {
            if(global.sendNotifs) try {
                const text = clipboard.readText();
                if(typeof text == `string` && text != lastText && text.split(`?`)[0].match(genericUrlRegex)) {
                    console.log(`new clipboard text, is url!`)
                    lastText = text;

                    const notif = new Notification({
                        title: `Download recently copied link?`,
                        body: `The link "${text}" was recently copied to your clipboard. Would you like to download it?`,
                        icon: require(`../core/downloadIcon`).get(`active`, null, true)
                    });

                    notif.show();

                    notif.on(`click`, (event, arg) => {
                        require(`../core/bringToFront`)();
                        console.log(`Downloading ${text}`);
                        global.window.webContents.send(`download`, text);
                    })
                } else if(text != lastText) {
                    console.log(`new clipboard text, but not url`)
                    lastText = text;
                }
            } catch(e) {
                console.error(`Failed to get clipboard`, e);
            }

            setTimeout(res, 1000)
        })
    }
})

module.exports = () => {
    const { downloadFromClipboard } = require(`../getConfig`)();

    if(downloadFromClipboard) start();

    return true;
}