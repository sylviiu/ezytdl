const { app } = require('electron');

const createWindow = require(`./util/window`)

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

    const window = createWindow()

    global.window = window;

    window.loadFile(`./html/loading.html`);
    
    const config = require(`./getConfig`)();

    console.log(`Successfully retrieved config!`, config);

    const latestClientDownloaded = await require(`./checks/clientIsDownloaded`)()

    if(!latestClientDownloaded) {
        window.loadFile(`./html/updating.html`);
    } else window.loadFile(`./html/index.html`);
})