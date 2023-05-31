const startTime = Date.now();

global.testrun = process.argv.find(s => s == `--testrun`) ? true : false;
global.headless = process.argv.find(s => s == `--headless`) ? true : false;

console.log(`Starting ezytdl v${require(`./package.json`).version}`)

const { app, ipcMain } = require(`electron`);

if(global.testrun || global.headless) {
    app.commandLine.appendSwitch(`--ignore-gpu-blacklist`);
    app.disableHardwareAcceleration();
}

global.configPath = app.getPath('userData');

process.on(`uncaughtException`, (err) => (global.testrun ? require(`./util/errorAndExit`) : require(`./util/errorHandler`))(`${typeof err == `object` ? JSON.stringify(err, null, 4) : err}\n\n${err.stack? err.stack : `(no stack)`}`))
process.on(`unhandledRejection`, (err) => (global.testrun ? require(`./util/errorAndExit`) : require(`./util/errorHandler`))(`${typeof err == `object` ? JSON.stringify(err, null, 4) : err}\n\n${err.stack? err.stack : `(no stack)`}`))

const locked = app.requestSingleInstanceLock();

if(!locked) {
    app.quit();
} else {
    let startedLoading = false;
    let doneLoading = false;

    setTimeout(() => {
        if(!doneLoading) {
            console.log(`Loading took too long!`);
            global.quitting = true;
            process.exit(1);
        }
    }, 30000)

    app.on(`second-instance`, () => {
        console.log(`second instance!`)
        require(`./core/bringToFront`)()
    });
    
    require(`./core/depcheck`)().then(() => {
        console.log(`Took [${Date.now() - startTime}ms] to finish depcheck`);

        const start = async () => {
            console.log(`Took [${Date.now() - startTime}ms] to finish app.whenReady`);

            const createWindow = require(`./core/window`)
        
            const window = createWindow();
            
            ipcMain.handle(`loading`, () => new Promise(async res => {
                console.log(`[${Date.now() - startTime}ms] Loading requested!`);

                if(startedLoading) return;
                startedLoading = true;

                const init = await require(`./init`)();

                console.log(`Took [${Date.now() - startTime}ms] to finish init!`);
        
                let redirect = `index.html`
                if(!init.ytdlpDownloaded && !global.testrun) redirect = `updating.html`;
        
                doneLoading = redirect;
                res(redirect);
                loadingPromise = null;
                console.log(`[${Date.now() - startTime}ms] to finish loading app!`);

                if(global.testrun) {
                    console.log(`[${Date.now() - startTime}ms] Waiting a few seconds before starting testrun...`);
    
                    setTimeout(() => {
                        console.log(`[${Date.now() - startTime}ms] Starting testrun...`)
                        require(`./devscripts/testrun`)(startTime);
                    }, 2500)
                } else {
                    console.log(`complete`)
                }
            }));
            if(!app.isPackaged) window.webContents.openDevTools();
            
        
            window.loadFile(`./html/loading.html`);
        };

        if(!app.isReady()) {
            app.whenReady().then(start)
        } else start();
    });
};