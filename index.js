const { app, BrowserWindow } = require('electron');

const { autoUpdater } = require(`electron-updater`);

global.app = app;

global.configPath = require(`appdata-path`)(`ezytdl`);

app.on('window-all-closed', () => app.quit())

const errorHandler = require(`./util/errorHandler`);

process.on(`uncaughtException`, (err) => {errorHandler(`${err}\n\n${err.stack? err.stack : `(no stack)`}`)})
process.on(`unhandledRejection`, (err) => {errorHandler(`${err}\n\n${err.stack? err.stack : `(no stack)`}`)})

autoUpdater.checkForUpdatesAndNotify();

app.whenReady().then(async () => {
    const app = await require(`./server`)();
    
    const window = new BrowserWindow({
        width: 800,
        height: 500,
        minHeight: 500,
        minWidth: 700,
        autoHideMenuBar: true,
        //icon: `./html/assets/img/logo.jpg`,
    });

    global.window = window;

    window.loadFile(`./html/loading.html`);
    
    const config = require(`./getConfig`)();

    console.log(`Successfully retrieved config!`, config);

    const latestClientDownloaded = await require(`./checks/clientIsDownloaded`)()

    if(!latestClientDownloaded) {
        window.loadFile(`./html/updating.html`);
    } else window.loadFile(`./html/index.html`);
})