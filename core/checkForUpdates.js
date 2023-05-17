const sendNotification = require("./sendNotification.js");

const { shell, app } = require(`electron`);

const notifyWithInfo = (info) => {
    global.updateAvailable = info.response.name || info.version;

    //console.log(info)

    const file = info.assets.find(d => d.name.startsWith(`ezytdl-${require('os').platform()}-${info.response.tag_name || info.version}`));

    console.log(`update file`, file)

    if(file && process.platform != `linux`) {
        console.log(`internal updater enabled`)
        //global.updateFunc = async () => global.window.loadURL(require('path').join(__dirname.split(`core`).slice(0, -1).join(`core`) + `/html/updating.html?ezytdll`))
        global.updateFunc = () => require(`./downloadClientPopout.js`)();
    } else {
        console.log(`internal updater disabled`)
        global.updateFunc = async () => shell.openExternal(info.url);
    }
    
    require(`./tray.js`).refresh();

    const d = new Date(info.response.published_at);

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
        bodyText: `${date} -- "${global.updateAvailable}" will be installed when you close the app!`
    })
};

global.updateCheckResult = null;

module.exports = async (manual) => {
    const process = (info) => {
        const currentVersion = require(`../package.json`).version;
        const newVersion = info.response.tag_name || info.version;

        if(newVersion !== currentVersion) {
            notifyWithInfo(info)
        } else if(manual) {
            sendNotification({
                headingText: `Up to date!`,
                bodyText: `You're already on the latest version!`,
                systemAllowed: true,
            })
        }
    }

    //if(!app.isPackaged) return null;

    if(!global.updateCheckResult || manual) {
        global.updateCheckResult = require(`../util/fetchLatestVersion/ezytdl`)();
        global.updateCheckResult.catch((e) => sendNotification({
            type: `error`, 
            headingText: `Error checking for updates!`,
            bodyText: `${e}`,
            systemAllowed: true,
        }));
        global.updateCheckResult.then(process);
    };
};