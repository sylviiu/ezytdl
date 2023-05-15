const { app, Menu, Tray, nativeImage, nativeTheme } = require('electron');

const { queue, queueEventEmitter, queueAction } = require(`../util/downloadManager`);

const fs = require('fs');

const buildTrayIcons = require(`../scripts/beforePack`);

global.tray = null;

const path = require('path')

let s = `/`;
if(process.platform == `win32`) s = `\\`;

const electronPath = require('electron').app.getAppPath();

module.exports = async () => {
    const regularIcon = (electronPath.includes(`app.asar`) ? `${electronPath.replace(`app.asar`, `app.asar.unpacked`)}/` : __dirname.split(`core`).slice(0, -1).join(`core`)) + (`dist/trayIcons/circle-down-regular.png`);
    const regularIconInv = (electronPath.includes(`app.asar`) ? `${electronPath.replace(`app.asar`, `app.asar.unpacked`)}/` : __dirname.split(`core`).slice(0, -1).join(`core`)) + (`dist/trayIcons/circle-down-regular-inv.png`);
    const solidIcon = (electronPath.includes(`app.asar`) ? `${electronPath.replace(`app.asar`, `app.asar.unpacked`)}/` : __dirname.split(`core`).slice(0, -1).join(`core`)) + (`dist/trayIcons/circle-down-solid.png`);
    const solidIconInv = (electronPath.includes(`app.asar`) ? `${electronPath.replace(`app.asar`, `app.asar.unpacked`)}/` : __dirname.split(`core`).slice(0, -1).join(`core`)) + (`dist/trayIcons/circle-down-solid-inv.png`);

    console.log(regularIcon, solidIcon)

    if(!fs.existsSync(regularIcon) || !fs.existsSync(solidIcon)) await buildTrayIcons();

    global.tray = new Tray(regularIcon);

    let current = `regular`;

    const updateTray = (type) => {
        console.log(`Updating tray -- type: ${type} / dark colors? ${nativeTheme.shouldUseDarkColors}`);

        if(type == `regular`) {
            if(nativeTheme.shouldUseDarkColors) {
                global.tray.setImage(regularIcon);
            } else {
                global.tray.setImage(regularIconInv);
            }
            current = `regular`;
        } else if(type == `solid`) {
            if(nativeTheme.shouldUseDarkColors) {
                global.tray.setImage(solidIcon);
            } else {
                global.tray.setImage(solidIconInv);
            }
            current = `solid`;
        }
    };

    nativeTheme.on(`updated`, () => updateTray(current));

    updateTray(`regular`);

    const createArrayAndApply = (queue) => {
        const length = Object.values(queue).slice(1).reduce((a,b) => a+b.length, 0);

        if((length + queue.complete.length) == 0 && current == `solid`) {
            updateTray(`regular`)
        } else if((length + queue.complete.length) > 0 && current == `regular`) {
            updateTray(`solid`)
        }

        const a = [];

        const str = [];

        if(queue.active.length > 0) str.push(`${queue.active.length} downloading`);
        if(queue.paused.length > 0) str.push(`${queue.active.length} paused`);
        if(queue.queue.length > 0) str.push(`${queue.queue.length} in queue`);

        a.push({
            //icon: icon,
            label: `ezytdl v${require(`../package.json`).version}`,
            enabled: false
        });

        a.push({
            label: `${queue.active.length} downloading`,
            enabled: false
        });

        a.push({
            label: `Check for updates`,
            click: () => require(`./checkForUpdates`)(true)
        })

        a.push({ type: `separator` })

        a.push({
            label: `Clear Queue (${queue.queue.length})`,
            click: () => queueAction(queue.queue.map(o => o.id), `remove`),
            enabled: queue.queue.length > 0
        });

        a.push({
            label: `Clear Completed (${queue.complete.length})`,
            click: () => queueAction(queue.complete.map(o => o.id), `remove`),
            enabled: queue.complete.length > 0
        });

        a.push({ type: `separator` }, {
            label: `Quit`,
            click: () => require(`./quit`)()
        })

        const contextMenu = Menu.buildFromTemplate(a);

        global.tray.setContextMenu(contextMenu);

        global.tray.setToolTip(`${length} in queue`);
    }

    queueEventEmitter.on(`queueUpdate`, createArrayAndApply);

    createArrayAndApply(queue);

    global.tray.on(`click`, require(`./bringToFront`));
}