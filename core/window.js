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

const getPath = require(`../util/getPath`)

const downloadIcons = require(`./downloadIcon`);

module.exports = (notDefault, overrideArgs) => {
    if(!app.isReady()) return null;

    if(currentWindow && !notDefault) return currentWindow;

    console.log(platform)

    const iconPath = getPath(`res/packageIcons/icon-` + (platform == `win32` ? `64x64.ico` : `512x512.png`))

    console.log(`Icon path: ${iconPath}`)

    const args = {
        width: 800,
        height: 500,
        minHeight: 300,
        minWidth: 550,
        autoHideMenuBar: true,
        fullscreenable: false,
        backgroundColor: `rgb(10,10,10)`,
        darkTheme: true,
        webPreferences: {
            nodeIntegration: false,
            nodeIntegrationInWorker: false,
            contextIsolation: true,
            devTools: true,
            sandbox: true,
            scrollBounce: true,
            backgroundThrottling: false,
            preload: path.join(__dirname, `preload.js`)
        },
        icon: iconPath
    };

    if(app.isPackaged) {
        console.log(`-------------\nSTARTING WITH PRODUCTION MODE\n-------------`)

        args.webPreferences.devTools = false;

        const setShortcuts = (enable) => {
            const accelerators = [`CommandOrControl+Shift+I`, `F12`];

            accelerators.forEach((accelerator) => {
                if(enable) {
                    console.log(`Disabled shortcut ${accelerator} (window is focused))`)
                    globalShortcut.register(accelerator, () => false);
                } else {
                    console.log(`Re-enabled shortcut ${accelerator} (window is unfocused)`)
                    globalShortcut.unregister(accelerator);
                }
            })
        }

        app.on('browser-window-blur', function () {
            setShortcuts(false);
        });

        app.on('browser-window-focus', function () {
            setShortcuts(true);
        })
    } else {
        console.log(`-------------\nSTARTING WITH DEVELOPMENT MODE\n-------------`);

        args.width = 1100;
    }

    if(currentWindow && !notDefault) return currentWindow;
    
    const window = new BrowserWindow(Object.assign({}, args, (overrideArgs || {})));

    if(!notDefault) {
        global.window = window;
        currentWindow = window;
        
        //downloadIcons.on(`lightIcon`, i => window.setIcon(i));
        //window.setIcon(downloadIcons.getCurrentIcon(true));

        window.on('close', (e) => {
            const config = require(`../getConfig`)();

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
        require(`./lockdown`)();
    }

    firstRun = false;

    return window;
}