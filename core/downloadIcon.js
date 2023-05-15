const { app, Menu, Tray, nativeImage, nativeTheme, ipcMain } = require('electron');

const fs = require('fs');

let current = `regular`;

const electronPath = require('electron').app.getAppPath();

const getPath = (path) => (electronPath.includes(`app.asar`) ? `${electronPath.replace(`app.asar`, `app.asar.unpacked`)}/` : __dirname.split(`core`).slice(0, -1).join(`core`) + `/`) + path

const icons = {
    regularIcon: getPath(`dist/trayIcons/circle-down-regular.png`),
    regularIconInv:getPath(`dist/trayIcons/circle-down-regular-inv.png`),
    solidIcon: getPath(`dist/trayIcons/circle-down-solid.png`),
    solidIconInv: getPath(`dist/trayIcons/circle-down-solid-inv.png`),
    checkIcon: getPath(`dist/trayIcons/circle-check-solid.png`),
    checkIconInv: getPath(`dist/trayIcons/circle-check-solid-inv.png`),
};

const buildTrayIcons = fs.existsSync(`./scripts/beforePack.js`) ? require(`../scripts/beforePack`) : () => {};

const events = new (require(`events`).EventEmitter)();

let currentIcon = icons.regularIcon;
events.on(`icon`, i => currentIcon = i);

const iconGetter = (type, alwaysUseLightIcon) => {
    let useDark = nativeTheme.shouldUseDarkColors;

    if(alwaysUseLightIcon === true) useDark = true;
    if(alwaysUseLightIcon === false) useDark = false;

    if(type == `solid`) {
        if(useDark) {
            console.log(`getting solid light`)
            return icons.solidIconInv
        } else {
            console.log(`getting solid dark`)
            return icons.solidIcon
        }
    } else if(type == `check`) {
        if(useDark) {
            console.log(`getting check light`)
            return icons.checkIconInv
        } else {
            console.log(`getting check dark`)
            return icons.checkIcon
        }
    } else {
        if(useDark) {
            console.log(`getting regular light`)
            return icons.regularIconInv
        } else {
            console.log(`getting regular dark`)
            return icons.regularIcon
        }
    }
}

module.exports = {
    on: (...c) => events.on(...c),
    getCurrentType: () => current,
    getCurrentIcon: (useWhite) => iconGetter(current, useWhite),
    getIcons: () => new Promise(async res => {
        let buildIcons = false;
    
        for(iconPath of Object.values(icons)) {
            if(!fs.existsSync(iconPath)) {
                buildIcons = true;
                break;
            }
        };
    
        if(buildIcons) await buildTrayIcons();

        res(icons);
    }),
    get: (type) => iconGetter(type),
    set: (type) => {
        const { alwaysUseLightIcon } = require(`../getConfig`)();
    
        if(!type) type = current;
        
        console.log(`Updating tray -- type: ${type} / use dark colors? ${nativeTheme.shouldUseDarkColors} / force light? ${alwaysUseLightIcon}`);
        
        events.emit(`icon`, iconGetter(type));
        events.emit(`lightIcon`, iconGetter(type, true));
        events.emit(`darkIcon`, iconGetter(type, false));
        events.emit(`iconType`, type);

        current = type
    }
};

nativeTheme.on(`updated`, () => global.updateTray());
ipcMain.on(`dark-mode:system`, () => global.updateTray());