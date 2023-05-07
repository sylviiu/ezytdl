const { app, BrowserWindow } = require('electron');

global.app = app;

global.configPath = require(`appdata-path`)(`ezytdl`);

app.on('window-all-closed', () => app.quit())

const errorAndExit = require(`./util/errorAndExit`);

process.on(`uncaughtException`, (err) => {errorAndExit(`${err}\n\n${err.stack? err.stack : `(no stack)`}`)})
process.on(`unhandledRejection`, (err) => {errorAndExit(`${err}\n\n${err.stack? err.stack : `(no stack)`}`)})

app.whenReady().then(async () => {
    const window = new BrowserWindow({
        width: 800,
        height: 500,
        minHeight: 500,
        minWidth: 700,
        autoHideMenuBar: true,
        //icon: `./html/assets/img/logo.jpg`,
    });

    window.loadFile(`./html/loading.html`);

    const app = await require(`./server`)();
    
    const config = require(`./getConfig`)();

    console.log(`Successfully retrieved config!`, config);

    const latestClientDownloaded = await require(`./checks/clientIsDownloaded`)()

    if(!latestClientDownloaded) {
        window.loadFile(`./html/updating.html`);
    } else window.loadFile(`./html/index.html`);
})