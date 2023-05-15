const { app, Menu, Tray, nativeImage, nativeTheme, ipcMain } = require('electron');

const { queue, queueEventEmitter, queueAction } = require(`../util/downloadManager`);

const fs = require('fs');

const buildTrayIcons = fs.existsSync(`./scripts/beforePack.js`) ? require(`../scripts/beforePack`) : () => {};

global.tray = null;

const path = require('path')

let s = `/`;
if(process.platform == `win32`) s = `\\`;

const electronPath = require('electron').app.getAppPath();

let current = `regular`;

const getPath = (path) => (electronPath.includes(`app.asar`) ? `${electronPath.replace(`app.asar`, `app.asar.unpacked`)}/` : __dirname.split(`core`).slice(0, -1).join(`core`) + `/`) + path

const icons = {
    regularIcon: getPath(`dist/trayIcons/circle-down-regular.png`),
    regularIconInv:getPath(`dist/trayIcons/circle-down-regular-inv.png`),
    solidIcon: getPath(`dist/trayIcons/circle-down-solid.png`),
    solidIconInv: getPath(`dist/trayIcons/circle-down-solid-inv.png`),
    checkIcon: getPath(`dist/trayIcons/circle-check-solid.png`),
    checkIconInv: getPath(`dist/trayIcons/circle-check-solid-inv.png`),
}

global.updateTray = (type) => {
    const { alwaysUseLightIcon } = require(`../getConfig`)();

    if(!type) type = current;
    
    console.log(`Updating tray -- type: ${type} / use dark colors? ${nativeTheme.shouldUseDarkColors} / force light? ${alwaysUseLightIcon}`);

    if(type == `regular`) {
        if(nativeTheme.shouldUseDarkColors || alwaysUseLightIcon) {
            console.log(`setting regular light`)
            global.tray.setImage(icons.regularIconInv);
        } else {
            console.log(`setting regular dark`)
            global.tray.setImage(icons.regularIcon);
        }
        current = `regular`;
    } else if(type == `solid`) {
        if(nativeTheme.shouldUseDarkColors || alwaysUseLightIcon) {
            console.log(`setting solid light`)
            global.tray.setImage(icons.solidIconInv);
        } else {
            console.log(`setting solid dark`)
            global.tray.setImage(icons.solidIcon);
        }
        current = `solid`;
    } else if(type == `check`) {
        if(nativeTheme.shouldUseDarkColors || alwaysUseLightIcon) {
            console.log(`setting check light`)
            global.tray.setImage(icons.checkIconInv);
        } else {
            console.log(`setting check dark`)
            global.tray.setImage(icons.checkIcon);
        }
        current = `solid`;
    }
};

module.exports = async () => {
    let buildIcons = false;

    for(iconPath of Object.values(icons)) {
        if(!fs.existsSync(iconPath)) {
            buildIcons = true;
            break;
        }
    };

    if(buildIcons) await buildTrayIcons();

    for(let icon of Object.keys(icons)) {
        console.log(`Converting ${icon} to native image / template`);
        const nativeIcon = nativeImage.createFromPath(icons[icon]);
        icons[icon] = nativeIcon
        console.log(`Finished converting ${icon} to native image / template`);
    }

    global.tray = new Tray(icons.regularIcon);

    nativeTheme.on(`updated`, () => global.updateTray());
    ipcMain.on(`dark-mode:system`, () => global.updateTray());
    global.updateTray(`regular`);

    const createArrayAndApply = (queue) => {
        const length = Object.values(queue).slice(1).reduce((a,b) => a+b.length, 0);

        if(length == 0 && queue.complete.length > 0 && current != `check`) {
            global.updateTray(`check`)
        } else if(length == 0 && current != `regular`) {
            global.updateTray(`regular`)
        } else if(length > 0 && current != `solid`) {
            global.updateTray(`solid`)
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