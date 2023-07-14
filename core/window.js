const { BrowserWindow, app, globalShortcut, session, contextBridge, ipcRenderer } = require('electron');

let currentWindow = null;

global.window = null;

global.windowHidden = false;

const path = require('path');
const sendNotification = require('./sendNotification');

const platform = process.platform;

let firstRun = true;

let s = `/`;
if(platform == `win32`) s = `\\`;

const getPath = require(`../util/getPath`);

module.exports = (notDefault, overrideArgs) => new Promise(async res => {
    if(!app.isReady()) return res(null);

    if(currentWindow && !notDefault) return res(currentWindow);

    const conf = await require('../getConfig')();

    global.defaultWindowControls = conf.defaultWindowControls;

    console.log(platform)

    let iconPath = `res/packageIcons/icon`;

    if(process.platform == `win32`) {
        iconPath += `-64x64.ico`;
    } else if(process.platform == `darwin`) {
        iconPath += `.icns`
    } else {
        iconPath += `-512x512.png`
    }

    iconPath = getPath(iconPath);

    console.log(`Icon path: ${iconPath}`)

    const args = {
        width: 875,
        height: 500,
        minHeight: 300,
        minWidth: 875,
        autoHideMenuBar: true,
        fullscreenable: false,
        backgroundColor: `rgb(10,10,10)`,
        darkTheme: true,
        webPreferences: {
            nodeIntegration: true,
            nodeIntegrationInWorker: false,
            nodeIntegrationInSubFrames: true,
            contextIsolation: true,
            devTools: true,
            sandbox: false,
            scrollBounce: true,
            backgroundThrottling: false,
            preload: path.join(__dirname, `preload.js`)
        },
        icon: iconPath
    };

    if(global.headless || global.testrun) {
        args.show = false;
    }

    if(!conf.defaultWindowControls) {
        console.log(`Hiding window controls and using custom ones`)
        args.frame = false
        args.titleBarStyle = `hidden-inset`
    } else console.log(`Using default window controls`);

    if(currentWindow && !notDefault) return res(currentWindow);

    if(notDefault && currentWindow) {
        Object.assign(args, {
            parent: currentWindow,
            modal: true,
            frame: false,
            titleBarStyle: `hidden`,
            titleBarOverlay: {
                color: `#0a0a0a`,
                symbolColor: `white`,
            },
            fullscreenable: false,
            //titleBarStyle: `hidden-inset`,
        });
    };

    const useArgs = Object.assign({}, args, (overrideArgs || {}));
    
    console.log(`window args`, useArgs)
    
    const window = new BrowserWindow(useArgs);

    if(!notDefault) {
        global.window = window;
        currentWindow = window;
        
        //downloadIcons.on(`lightIcon`, i => window.setIcon(i));
        //window.setIcon(downloadIcons.getCurrentIcon(true));

        window.on('close', (e) => {
            //const config = require(`../getConfig`)();
            const config = global.lastConfig;

            console.log(`closing to tray: ${config.closeToTray}`)

            if(global.quitting) {
                console.log(`quitting -- not doing anything here`)
            } else {
                e.preventDefault();

                if(!config.closeToTray && !global.quitting) {
                    console.log(`prompting`)
                    require(`./quit`)();
                } else {
                    console.log(`not prompting`)
                    global.windowHidden = true;
                    window.hide();
                    if(!config.systemTrayNotifSent && platform != `darwin`) {
                        sendNotification({
                            headingText: `App minimized to tray`,
                            bodyText: `The app has been minimized to the system tray. You can right click the icon to quit the app.`,
                            systemAllowed: true,
                        });
                        const updated = require(`../getConfig`)({ systemTrayNotifSent: true });
                    }
                };
            }
        });
    }

    if(firstRun) {
        require(`./ipcHandler`)();
        console.log(`-- FIRSTRUN TASKS COMPLETE`)
    };

    require(`./lockdown`)(window, firstRun);

    firstRun = false;

    console.log(`returning window`)

    return res(window);
})