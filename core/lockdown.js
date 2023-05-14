const { BrowserWindow, app, globalShortcut, session } = require('electron');

module.exports = () => {
    app.on('web-contents-created', (event, contents) => {
        contents.setWindowOpenHandler(({ url }) => {
            const genericURLRegex = /^https?:\/\/(www\.)?[^\/]+\/?$/i

            if (`${url}`.match(genericURLRegex)) shell.openExternal(url)
        
            return { action: 'deny' }
        })
    });
    
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [`script-src 'unsafe-inline' 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net`],
            }
        })
    })
}