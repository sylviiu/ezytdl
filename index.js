const { app, ipcMain } = require('electron');

const locked = app.requestSingleInstanceLock();

if(!locked) {
    return app.quit();
} else {
    app.on(`second-instance`, () => {
        console.log(`second instance!`)
        require(`./core/bringToFront`)()
    })
}

const sendNotification = require(`./core/sendNotification`)

global.configPath = app.getPath('userData')

const config = require(`./getConfig`)();

if(config.logsEnabled) {
    console.log(`Keeping logs enabled`)
    sendNotification({
        type: `warn`,
        headingText: `Debug logs enabled!`,
        bodyText: `Debug logs are enabled in the config. This most likely will slow down the app.`
    });
} else if(app.isPackaged) {
    console.log(`Packaged build -- disabling logs for higher speed. (You can still enable them in the config)`);
    console.log = () => {};
} else console.log(`Running from source -- keeping logs enabled.`);

const createWindow = require(`./core/window`)

global.app = app;

const errorHandler = require(`./util/errorHandler`);
const determineGPUDecode = require('./util/determineGPUDecode');

process.on(`uncaughtException`, (err) => {errorHandler(`${err}\n\n${err.stack? err.stack : `(no stack)`}`)})
process.on(`unhandledRejection`, (err) => {errorHandler(`${err}\n\n${err.stack? err.stack : `(no stack)`}`)})

let doneLoading = false;
let loadingPromise = null;

app.whenReady().then(async () => {
    const window = createWindow();

    loadingPromise = new Promise(async res => {
        await require(`./core/downloadIcon`).getIcons();
    
        require(`./core/tray`)();
        require(`./core/checkForUpdates`)();
    
        const latestClientDownloaded = await require(`./checks/ytdlpIsDownloaded`)(true);

        let redirect = `index.html`
        if(!latestClientDownloaded) redirect = `updating.html`;

        doneLoading = redirect;
        res(redirect);
        loadingPromise = null;
    });

    ipcMain.handle(`loading`, () => new Promise(async res => {
        console.log(`Loading requested!`)
        if(doneLoading) {
            console.log(`already done loading; resolving`)
            return res(doneLoading);
        } else if(loadingPromise) {
            console.log(`promise exists; waiting`)
            return loadingPromise.then(res)
        }
    }));

    window.loadFile(`./html/loading.html`);
})