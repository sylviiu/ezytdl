const sendNotification = require("./sendNotification.js");

const { shell, app, ipcMain } = require(`electron`);

const notifyWithInfo = (info) => {
    global.updateAvailable = info.response.name || info.version;

    ipcMain.emit(`updateAvailable`)

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
        bodyText: `${date} -- "${global.updateAvailable}" is available to download!`
    })
};

global.updateCheckResult = null;

module.exports = async (manual) => {
    if(global.testrun) return null;
    
    const process = (info) => {
        if(info.response && info.response.tag_name.startsWith(`v`)) info.response.tag_name = info.response.tag_name.slice(1);
        if(info.version && info.version.startsWith(`v`)) info.version = info.version.slice(1);

        const currentVersion = (require(`../package.json`).version).split(`.`).map(s => Number(s));
        const newVersion = (info.response.tag_name || info.version).split(`.`).map(s => Number(s));

        let updateAvailable = false;

        if(newVersion[0] > currentVersion[0]) {
            console.log(`apparently a new Huge update released. (${currentVersion[0]}.x.x -> ${newVersion[0]}.x.x)`);
            updateAvailable = true;
        } else if(newVersion[1] > currentVersion[1]) {
            console.log(`new Big update! (x.${currentVersion[1]}.x -> x.${newVersion[1]}.x)`);
            updateAvailable = true;
        } else if(newVersion[2] > currentVersion[2]) {
            console.log(`new minor update! (x.x.${currentVersion[2]} -> x.x.${newVersion[2]})`);
            updateAvailable = true;
        } else {
            console.log(`latest update is not newer than current version (current: ${currentVersion.join(`.`)}; latest: ${newVersion.join(`.`)})`)
        };

        if(updateAvailable) {
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
        global.updateCheckResult.then(i => typeof i == `object` ? process(i) : null);
    };
};