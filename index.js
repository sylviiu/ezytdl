const { app } = require('electron');

const createWindow = require(`./core/window`)

global.app = app;

global.configPath = require(`appdata-path`)(`ezytdl`);

app.on('window-all-closed', () => app.quit())

const errorHandler = require(`./util/errorHandler`);
const determineGPUDecode = require('./util/determineGPUDecode');

process.on(`uncaughtException`, (err) => {errorHandler(`${err}\n\n${err.stack? err.stack : `(no stack)`}`)})
process.on(`unhandledRejection`, (err) => {errorHandler(`${err}\n\n${err.stack? err.stack : `(no stack)`}`)})

app.whenReady().then(async () => {
    require(`./util/checkForUpdates`)();

    const window = createWindow()

    window.loadFile(`./html/loading.html`);
    
    const config = require(`./getConfig`)();

    console.log(`Successfully retrieved config!`, config);

    const latestClientDownloaded = await require(`./checks/ytdlpIsDownloaded`)(true);

    if(!latestClientDownloaded) {
        window.loadFile(`./html/updating.html`);
    } else window.loadFile(`./html/index.html`);
})