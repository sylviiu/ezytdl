const { app, globalShortcut, session, shell } = require('electron');

const path = require('path');

const fs = require('fs')

module.exports = (window, firstRun) => {
    const genericURLRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i;

    const urlHandler = (e, url) => {
        console.log(`urlHandler:`, url)

        if(url.split(`?`)[0].match(genericURLRegex)) {
            console.log(`opening in new window (url regex matched)`)
            if(e && e.preventDefault) e.preventDefault();
            shell.openExternal(url);
        } else {
            console.log(`opening in app`);
        }
    }

    window.webContents.on('will-navigate', urlHandler);

    window.webContents.setWindowOpenHandler((e) => {
        console.log(`prevented new window;`, e.url)
        if(e.url && e.url.startsWith(`file:///`)) {
            window.loadFile(path.join(__dirname.split(`core`).slice(0, -1).join(`core`), `html`, e.url.split(`/`).slice(-1)[0]));
        } else if(e.url) urlHandler(null, e.url)
        return { action: `deny` }
    });

    window.webContents.on(`new-window`, (e, url) => {
        console.log(`new-window:`, url)
        e.stopImmediatePropagation();
        e.preventDefault();
        window.loadFile(url);
    }, true)

    window.on(`focus`, () => {
        console.log(`window focused`)
        global.sendNotifs = true;
        window.focused = true;
        require(`./sendNotification`)();
    })

    window.on(`blur`, () => {
        console.log(`window blurred`)
        global.sendNotifs = false;
        window.focused = false;
    })

    if(firstRun) {
        app.on('web-contents-created', (event, contents) => {
            contents.setWindowOpenHandler(({ url }) => {
                if(`${url}`.match(genericURLRegex)) shell.openExternal(url)
            
                return { action: 'deny' }
            })
        });

        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [`script-src 'self'`],
                }
            })
        });
    }
}