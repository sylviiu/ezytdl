const sendNotification = require("./sendNotification.js");

const { shell, app, ipcMain } = require(`electron`);

let promises = [];

let checkingForUpdates = false;

let lastChecked = 0;

const setProgress = (opt) => {
    if(!opt) while(promises.length) promises.pop().res(false);

    if(!opt && !checkingForUpdates) return;

    if(typeof opt == `object` && JSON.stringify(opt) == JSON.stringify(module.exports.progress)) return;

    checkingForUpdates = opt ? true : false;

    module.exports.progress = opt;
    if(global.window) global.window.webContents.send(`updateProgress`, opt);

    console.log(`sending update progress`, opt)
}

const notifyWithInfo = (info, downloaded) => {
    while(promises.length) promises.pop().res(true);

    global.updateAvailable = info.version.slice(6);

    if(global.window) global.window.webContents.send(`updateAvailable`);

    //ipcMain.emit(`updateAvailable`)

    //console.log(info)

    global.updateFunc = () => {
        if(downloaded) {
            autoUpdater.quitAndInstall(false, true);
        } else {
            global.updateFunc = async () => shell.openExternal(`https://github.com/sylviiu/ezytdl/releases/tag/${info.version}`);
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

    const opt = {
        headingText: `Update available! (${info.releaseName})`,
        bodyText: (`${date} -- "${global.updateAvailable}" `) + (downloaded ? `is available to download!` : `will be installed when you exit!`)
    };

    if(!downloaded) Object.assign(opt, {
        redirect: `https://github.com/sylviiu/ezytdl/releases/${info.version}`,
        redirectMsg: `Download latest release`
    })

    sendNotification(opt)
};

const { autoUpdater, AppUpdater } = require(`electron-updater`);

autoUpdater.autoDownload = false;
AppUpdater.autoDownload = false;

if(process.platform == `win32` || process.platform == `linux`/* || process.platform == `darwin`*/) {
    autoUpdater.autoDownload = true;
    AppUpdater.autoDownload = true;
    // darwin removed because i have to sign the app with my deadname in order for that to work. fuck apple.

    autoUpdater.on(`update-downloaded`, (info) => {
        notifyWithInfo(info, true);
        setProgress(null);
    });
} else {
    autoUpdater.on(`update-available`, (info) => {
        notifyWithInfo(info, false);
        setProgress(null);
    });
};

autoUpdater.on(`download-progress`, (o) => {
    if(o && o.percent) {
        const obj = { progress: o.percent, status: `Downloading update...` };
        console.log(obj);
        setProgress(obj)
    }
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

module.exports = (manual) => new Promise(async res => {
    const pkg = require(`../package.json`);

    if(global.testrun) return res(null);

    // if the last check was less than 15 minutes ago, don't check again unless it's a manual check
    if(Date.now() - lastChecked > 900000 && !manual) return res(null);

    //const { nightlyUpdates } = await require(`../getConfig`)()

    //const nightlyAllowed = nightlyUpdates ? true : false;
    
    autoUpdater.allowPrerelease = true;
    AppUpdater.allowPrerelease = true;

    /*if((!nightlyUpdates && pkg.version.includes(`-dev.`))) {
        autoUpdater.currentVersion = `1.0.0`;
        AppUpdater.currentVersion = `1.0.0`;
    } else {
        autoUpdater.currentVersion = pkg.version;
        AppUpdater.currentVersion = pkg.version;
    }*/

    //autoUpdater.currentVersion = pkg.version;
    //AppUpdater.currentVersion = pkg.version;

    autoUpdater.allowDowngrade = true;
    AppUpdater.allowDowngrade = true;

    if(!autoUpdater.isUpdaterActive() && manual) {
        setProgress(null);

        if(!app.isPackaged) {
            setTimeout(() => {
                setProgress(null);
                sendNotification({
                    headingText: `Build is not updatable!`,
                    bodyText: `This build is not updatable. Please download an auto-updatable build from the releases page.`,
                    redirect: `https://github.com/sylviiu/ezytdl/releases`,
                    redirectMsg: `Download latest release`
                })
            }, 5000)

            setProgress({progress: -1, status: `Test run! (app not packaged)`});
        } else sendNotification({
            headingText: `Build is not updatable!`,
            bodyText: `This build is not updatable. Please download an auto-updatable build from the releases page.`,
            redirect: `https://github.com/sylviiu/ezytdl/releases`,
            redirectMsg: `Download latest release`
        });

        return res(null);
    } else if(!autoUpdater.isUpdaterActive()) return res(null);

    if(checkingForUpdates && manual) {
        sendNotification({
            headingText: `Already checking for updates!`,
            bodyText: `ezytdl is already checking for updates!`,
        });
        res(null)
    } else if(!global.updateAvailable || manual) {
        promises.push({res});
        setProgress({ progress: -1, status: `Checking for updates...` });
        autoUpdater.checkForUpdates();
    } else {
        console.log(`refusing to check for updates; updateavailable? ${global.updateAvailable}; manual? ${manual}; checking? ${checkingForUpdates}`)
        res(null);
    }
});

module.exports.setProgress = setProgress;