const { app, ipcMain } = require(`electron`);

const getPath = require(`../util/getPath`)

module.exports = async () => {
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
    
        app.on(`second-instance`, (e, argv, wd, additionalData) => {
            if(additionalData && typeof additionalData == `object` && additionalData.type) {
                if(getPath(`./system/${additionalData.type}.js`, true)) {
                    require(`../system/${additionalData.type}.js`).client(additionalData);
                } else return require(`../util/errorHandler`)(`Mode "${additionalData.type}" not found!`)
            } else {
                console.log(`second instance! (${argv.join(` `)})`, additionalData)
                require(`../core/bringToFront`)()
            }
        });
        
        require(`../core/depcheck`)().then(() => {
            console.log(`Took [${Date.now() - startTime}ms] to finish depcheck`);
    
            const start = async () => {
                console.log(`Took [${Date.now() - startTime}ms] to finish app.whenReady`);
    
                const createWindow = require(`../core/window`);

                let overrideArgs = {};

                if(process.argv.includes(`--hidden`)) {
                    overrideArgs.show = false;
                    global.windowHidden = true;
                }
            
                const window = await createWindow(false, overrideArgs);
    
                let requestedLoading = Date.now();
                
                ipcMain.handle(`loading`, () => {
                    requestedLoading = Date.now();
                    if(doneLoading) return Promise.resolve(doneLoading)
    
                    if(!startedLoading) startedLoading = new Promise(async res => {
                        console.log(`[${Date.now() - startTime}ms] Loading requested!`);
        
                        const init = await require(`../init`)();
        
                        console.log(`Took [${Date.now() - startTime}ms] to finish init!`);
                
                        let redirect = `index.html`
                        if(!init.ytdlpDownloaded && !global.testrun) redirect = `index.html`;
                
                        doneLoading = redirect;
                        res(redirect);
                        loadingPromise = null;
                        console.log(`[${Date.now() - startTime}ms] to finish loading app! (UI took ${Date.now() - requestedLoading}ms)`);
        
                        if(global.testrun) {
                            console.log(`[${Date.now() - startTime}ms] Waiting a few seconds before starting testrun...`);
            
                            setTimeout(() => {
                                console.log(`[${Date.now() - startTime}ms] Starting testrun...`)
                                require(`../devscripts/testrun`)(startTime);
                            }, 2500)
                        } else {
                            console.log(`complete`)
                        }
                    });
                    
                    return startedLoading;
                });
                
                //if(!app.isPackaged) window.webContents.openDevTools();
                
                window.loadFile(`./html/loading.html`);
            };
    
            if(!app.isReady()) {
                app.whenReady().then(start)
            } else start();
        });

        process.on(`SIGINT`, require(`../core/quit`).quit);
    };
}