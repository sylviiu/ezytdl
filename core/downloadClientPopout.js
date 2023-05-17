module.exports = () => {
    /*const window = require(`./window`)(true, {
        width: 600,
        height: 250,
        minWidth: 0,
        minHeight: 0,
        resizable: false
    });

    window.loadURL(require(`path`).join(__dirname.split(`core`).slice(0, -1).join(`core`), `html`, `updating-fullscreen.html?ezytdll`))*/

    global.window.loadURL(require(`path`).join(__dirname.split(`core`).slice(0, -1).join(`core`), `html`, `updating-fullscreen.html?ezytdll`))
}