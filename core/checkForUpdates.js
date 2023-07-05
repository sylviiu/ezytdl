const sendNotification = require("./sendNotification.js");

const { shell, app, ipcMain } = require(`electron`);

let checkingForUpdates = false;

let lastChecked = 0;

const setProgress = (opt) => {
    if(!opt && !checkingForUpdates) return;

    if(typeof opt == `object` && JSON.stringify(opt) == JSON.stringify(module.exports.progress)) return;

    checkingForUpdates = opt ? true : false;

    module.exports.progress = opt;
    if(global.window) global.window.webContents.send(`updateProgress`, opt);

    console.log(`sending update progress`, opt)
}

const notifyWithInfo = (info, downloaded) => {
    global.updateAvailable = info.version;

    if(global.window) global.window.webContents.send(`updateAvailable`);

    //ipcMain.emit(`updateAvailable`)

    //console.log(info)

    global.updateFunc = () => {
        if(downloaded) {
            autoUpdater.quitAndInstall(false, true);
        } else {
            global.updateFunc = async () => shell.openExternal(`https://github.com/ezytdl/ezytdl/releases/tag/${info.version}`);
        }
    }
    
    require(`./tray.js`).refresh();

    require(`./downloadIcon.js`).set();

    const d = new Date(info.releaseDate);

    const timeSinceReleased = new Date(Date.now() - d.getTime());

    const months = timeSinceReleased.getUTCMonth();
    const days = timeSinceReleased.getUTCDate() - 1;
    const hours = timeSinceReleased.getUTCHours();
    const minutes = timeSinceReleased.getUTCMinutes();

    const arr = []

    if(months > 0) arr.push(`${months} month${months > 1 ? `s` : ``}`)
    if(days > 0) arr.push(`${days} day${days > 1 ? `s` : ``}`)
    if(hours > 0) arr.push(`${hours} hour${hours > 1 ? `s` : ``}`)
    if(minutes > 0 || arr.length == 0) arr.push(`${minutes} minute${minutes > 1 ? `s` : ``}`)

    let date = ``

    if(arr.length > 1) {
        date = `Released ${arr.slice(0, -1).join(`, `)} and ${arr.slice(-1)} ago`;
    } else {
        date = `Released ${arr[0]} ago`;
    }

    sendNotification({
        headingText: `Update available! (${info.version})`,
        bodyText: (`${date} -- "${global.updateAvailable}" `) + (downloaded ? `is available to download!` : `will be installed when you exit!`)
    })
};

const { autoUpdater } = require(`electron-updater`);
const { check } = require("yargs");

autoUpdater.autoDownload = false;

if(process.platform == `win32`/* || process.platform == `darwin`*/) {
    autoUpdater.autoDownload = true;
    // linux also has auto app updates, but it just downloads a new appimage and deletes the old one. it's very inconvenient.
    // darwin removed because i have to sign the app with my deadname in order for that to work. fuck apple.

    autoUpdater.on(`update-downloaded`, (info) => {
        setProgress(null);
        notifyWithInfo(info, true);
    });
} else {
    autoUpdater.on(`update-available`, (info) => {
        setProgress(null);
        notifyWithInfo(info, false);
    });
};

autoUpdater.on(`download-progress`, ({bytesPerSecond, percent, total, transferred}) => {
    setProgress({ percent, status: `Downloading update... (at ${bytesPerSecond / 1e-6}mb/s)` })
});

autoUpdater.on(`update-not-available`, (info) => {
    setProgress(null);
    sendNotification({
        headingText: `Up to date!`,
        bodyText: `You're already on the latest version!`,
        systemAllowed: true,
    })
});

autoUpdater.on(`error`, (e) => {
    setProgress(null);
    console.error(e)
    sendNotification({
        headingText: `Update error!`,
        bodyText: `An error occurred while checking for updates. Please try again later.`,
        type: `error`
    })
})

module.exports = async (manual) => {
    if(global.testrun) return null;

    // if the last check was less than 15 minutes ago, don't check again unless it's a manual check
    if(Date.now() - lastChecked > 900000 && !manual) return;

    const { nightlyUpdates } = require(`../getConfig`)()

    if(nightlyUpdates) {
        autoUpdater.allowPrerelease = true;
        //autoUpdater.allowDowngrade = true;
    }

    if(!autoUpdater.isUpdaterActive() && manual) {
        setProgress(null);

        if(!app.isPackaged) {
            setTimeout(() => {
                setProgress(null);
                sendNotification({
                    headingText: `Build is not updatable!`,
                    bodyText: `This build is not updatable. Please download an auto-updatable build from the releases page.`,
                })
            }, 5000)

            setProgress({progress: -1, status: `Test run! (app not packaged)`});
        } else sendNotification({
            headingText: `Build is not updatable!`,
            bodyText: `This build is not updatable. Please download an auto-updatable build from the releases page.`,
        });

        return;
    } else if(!autoUpdater.isUpdaterActive()) return;

    if(checkingForUpdates && manual) return sendNotification({
        headingText: `Already checking for updates!`,
        bodyText: `ezytdl is already checking for updates!`,
    })
    
    if(!global.updateAvailable || manual) {
        setProgress({ progress: -1, status: `Checking for updates...` });
        autoUpdater.checkForUpdates();
    }
};