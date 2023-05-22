const sendNotification = require("./sendNotification.js");

const { shell, app, ipcMain } = require(`electron`);

const notifyWithInfo = (info, downloaded) => {
    global.updateAvailable = info.version;

    ipcMain.emit(`updateAvailable`)

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

    sendNotification({
        headingText: `Update available! (${info.version})`,
        bodyText: (`${date} -- "${global.updateAvailable}" `) + (downloaded ? `is available to download!` : `will be installed when you exit!`)
    })
};

const { autoUpdater } = require(`electron-updater`);

autoUpdater.autoDownload = false;

if(process.platform == `win32` || process.platform == `darwin`) {
    autoUpdater.autoDownload = true;
    // linux also has auto app updates, but it just downloads a new appimage and deletes the old one. it's very inconvenient.
    
    autoUpdater.on(`update-downloaded`, (info) => {
        notifyWithInfo(info, true);
    });
} else {
    autoUpdater.on(`update-available`, (info) => {
        notifyWithInfo(info, false);
    });
};

autoUpdater.on(`update-not-available`, (info) => {
    sendNotification({
        headingText: `Up to date!`,
        bodyText: `You're already on the latest version!`,
        systemAllowed: true,
    })
});

autoUpdater.on(`error`, (e) => {
    console.error(e)
    sendNotification({
        headingText: `Update error!`,
        bodyText: `An error occurred while checking for updates. Please try again later.`,
        type: `error`
    })
})

module.exports = async (manual) => {
    if(global.testrun) return null;

    const currentVersion = require(`../package.json`).version;

    if(currentVersion.includes(`-nightly.`)) {
        sendNotification({
            headingText: `Nightly build!`,
            bodyText: `You're using a nightly build! These are used for testing and may contain bugs.`
        });

        autoUpdater.allowPrerelease = true;
    }

    if(!autoUpdater.isUpdaterActive() && manual) {
        sendNotification({
            headingText: `Build is not updatable!`,
            bodyText: `This build is not updatable. Please download an auto-updatable build from the releases page.`,
        })
    } else if(!global.updateAvailable || manual) {
        autoUpdater.checkForUpdates();
    }
};