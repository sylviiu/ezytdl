const startTime = Date.now();

console.log(`Starting ezytdl v${require(`./package.json`).version}`)

const { app, ipcMain } = require(`electron`);
global.configPath = app.getPath('userData');

process.on(`uncaughtException`, (err) => require(`./util/errorHandler`)(`${err}\n\n${err.stack? err.stack : `(no stack)`}`))
process.on(`unhandledRejection`, (err) => require(`./util/errorHandler`)(`${err}\n\n${err.stack? err.stack : `(no stack)`}`))

const locked = app.requestSingleInstanceLock();

if(!locked) {
    app.quit();
} else {
    app.on(`second-instance`, () => {
        console.log(`second instance!`)
        require(`./core/bringToFront`)()
    });
    
    require(`./core/depcheck`)().then(() => {
        console.log(`Took [${Date.now() - startTime}ms] to finish depcheck`);

        let doneLoading = false;
        let loadingPromise = null;

        const start = async () => {
            console.log(`Took [${Date.now() - startTime}ms] to finish app.whenReady`);

            const createWindow = require(`./core/window`)
        
            const window = createWindow();
        
            loadingPromise = new Promise(async res => {
                const init = await require(`./init`)();

                console.log(`Took [${Date.now() - startTime}ms] to finish init!`, init);
        
                let redirect = `index.html`
                if(!init.ytdlpDownloaded) redirect = `updating.html`;
        
                doneLoading = redirect;
                res(redirect);
                loadingPromise = null;
                console.log(`[${Date.now() - startTime}ms] to finish loading app!`);
            
                if(!app.isPackaged) window.webContents.openDevTools()
            });
        
            ipcMain.handle(`loading`, () => new Promise(async res => {
                console.log(`[${Date.now() - startTime}ms] Loading requested!`)
                if(doneLoading) {
                    console.log(`already done loading; resolving`)
                    return res(doneLoading);
                } else if(loadingPromise) {
                    console.log(`promise exists; waiting`)
                    return loadingPromise.then(res)
                }
            }));
        
            window.loadFile(`./html/loading.html`);
        };

        if(!app.isReady()) {
            app.whenReady().then(start)
        } else start();
    });
};