const { sendNotification } = require(`./downloadManager`);

module.exports = () => {
    const { autoUpdater } = require(`electron-updater`);
    
    //autoUpdater.autoDownload = true;

    autoUpdater.checkForUpdates();

    autoUpdater.on(`error`, (e) => {
        sendNotification({
            type: `error`, 
            headingText: `Error checking for updates!`,
            bodyText: `${e}`
        })
    });

    autoUpdater.on(`update-downloaded`, (info) => {
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
            bodyText: `${date} -- ${info.releaseName} will be installed when you close the app!`
        })
    })
}