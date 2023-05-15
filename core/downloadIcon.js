const { app, Menu, Tray, nativeImage, nativeTheme, ipcMain } = require('electron');
const sharp = require('sharp');
const fs = require('fs');

let current = `regular`;

const getPath = require(`../util/getPath`)

const icons = {
    regularIcon: getPath(`res/trayIcons/circle-down-regular.svg`),
    solidIcon: getPath(`res/trayIcons/circle-down-solid.svg`),
    checkIcon: getPath(`res/trayIcons/circle-check-solid.svg`),
};

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
};

const iconToPNG = (icon, size, negate) => {
    const sharpIcon = sharp(icon).resize(Math.round(size), Math.round(size));
    if(negate) sharpIcon.negate({ alpha: false });
    return sharpIcon.png().toBuffer();
}

module.exports = {
    on: (...c) => events.on(...c),
    getCurrentType: () => current,
    getCurrentIcon: (useWhite) => iconGetter(current, useWhite),
    getIcons: () => new Promise(async res => {
        //await buildTrayIcons();

        let supportedMultipliers = [ 1, 1.25, 1.33, 1.4, 1.5, 1.8, 2, 2.5, 3, 4, 5, 32 ]
        let sizes = supportedMultipliers.map(m => 16 * m);
        // https://www.electronjs.org/docs/latest/api/native-image#high-resolution-image

        console.log(`Getting icons...`)

        const createIcon = (iconFile, negate) => new Promise(async res => {
            let nativeIcon;

            console.log(`Creating ${iconFile} / negate: ${negate}`)

            for(let i in sizes.reverse()) {
                const size = sizes[i];
                const icon = await iconToPNG(iconFile, size, negate);

                if(nativeIcon) {
                    nativeIcon.addRepresentation({
                        scaleFactor: supportedMultipliers[i],
                        width: size,
                        height: size,
                        buffer: icon
                    });
                } else {
                    nativeIcon = nativeImage.createFromBuffer(icon);
                }
            };

            res(nativeIcon);
        });

        for(iconFile of Object.keys(icons)) {
            if(typeof icons[iconFile] == `string`) {
                const str = icons[iconFile];

                icons[iconFile] = await createIcon(str);
                console.log(`nativeIcon ${iconFile} scalefactors`, icons[iconFile].getScaleFactors());

                icons[iconFile + `Inv`] = await createIcon(str, true);
                console.log(`nativeIconInv ${iconFile} scalefactors`, icons[iconFile + `Inv`].getScaleFactors());
            } else continue;
        }

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

nativeTheme.on(`updated`, () => module.exports.set());
ipcMain.on(`dark-mode:system`, () => module.exports.set());