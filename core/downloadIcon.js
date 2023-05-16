const { app, Menu, Tray, nativeImage, nativeTheme, ipcMain } = require('electron');
const sharp = require('sharp');

let current = `regular`;

const getPath = require(`../util/getPath`)

const icons = {
    noQueue: getPath(`res/trayIcons/circle-down-regular.svg`),
    active: getPath(`res/trayIcons/circle-down-solid.svg`),
    complete: getPath(`res/trayIcons/circle-check-solid.svg`),
    mixed: getPath(`res/trayIcons/circle-dot-solid.svg`),
    errored: getPath(`res/trayIcons/circle-xmark-solid.svg`),
    update: getPath(`res/trayIcons/circle-up-solid.svg`),
};

const events = new (require(`events`).EventEmitter)();

let currentIcon = icons.regularIcon;
events.on(`icon`, i => currentIcon = i);

const iconGetter = (type, alwaysUseLightIcon) => {
    let useDark = nativeTheme.shouldUseDarkColors;

    if(alwaysUseLightIcon === true) useDark = true;
    if(alwaysUseLightIcon === false) useDark = false;

    if(!icons[type]) type = global.updateAvailable ? `update` : `noQueue`

    if(useDark) {
        console.log(`getting ${type} light`);
        return icons[type + `Inv`]
    } else {
        console.log(`getting ${type} dark`);
        return icons[type]
    }
};

const iconToPNG = (icon, size, negate) => {
    const sharpIcon = sharp(icon).resize(Math.round(size), Math.round(size));
    if(negate) sharpIcon.negate({ alpha: false });
    return sharpIcon.png().toBuffer();
}

let getIconsPromise = null;
let getIconsComplete = false;

module.exports = {
    on: (...c) => events.on(...c),
    getCurrentType: () => current,
    getCurrentIcon: (useWhite) => iconGetter(current, useWhite),
    getIcons: () => {
        if(getIconsComplete) return Promise.resolve(icons);

        if(!getIconsPromise) getIconsPromise = new Promise(async res => {
            let supportedMultipliers = [ 1, 1.25, 1.33, 1.4, 1.5, 1.8, 2, 2.5, 3, 4, 5, 32 ];

            if(process.platform == `darwin`) supportedMultipliers = [ 1, 2 ]

            let sizes = supportedMultipliers.map(m => 16 * m);
            // https://www.electronjs.org/docs/latest/api/native-image#high-resolution-image
    
            console.log(`Getting icons...`)
    
            const createIcon = (iconFile, negate) => new Promise(async res => {
                let nativeIcon;
    
                console.log(`Creating ${iconFile} / negate: ${negate}`)

                let reversedSizes = sizes.reverse();

                const originalWidth = sizes[0]
    
                for(let i in reversedSizes) {
                    const size = reversedSizes[i];
                    const icon = await iconToPNG(iconFile, size, negate);
    
                    if(nativeIcon) {
                        nativeIcon.addRepresentation({
                            scaleFactor: supportedMultipliers[i],
                            //width: originalWidth,
                            //height: originalWidth,
                            buffer: icon
                        });
                    } else {
                        nativeIcon = nativeImage.createFromBuffer(icon);
                    }
                };
    
                res(nativeIcon);
            });

            const threads = require('os').cpus().length;
            //const threads = 4;

            const iconPromises = [];

            const originalIcons = Object.assign({}, icons);

            const iconKeys = [...Object.keys(icons).map(k => k + `Inv`), ...Object.keys(icons)];

            const chunkSize = Math.ceil(iconKeys.length / threads);

            for(let i = 0; i < iconKeys.length; i += chunkSize) {
                const chunk = iconKeys.slice(i, i + chunkSize);
                console.log(chunk)
                iconPromises.push(new Promise(async res => {    
                    const starttime = Date.now();

                    for(let iconFile of chunk) await new Promise(async r => {
                        let inv = iconFile.endsWith(`Inv`);

                        if(inv) iconFile = iconFile.slice(0, -3);

                        if(typeof originalIcons[iconFile] == `string`) {
                            const str = originalIcons[iconFile];

                            icons[iconFile + (inv ? `Inv` : ``)] = await createIcon(str, inv);
                            console.log(`(${Date.now() - starttime}ms) nativeIcon ${iconFile}${inv ? ` (inv)` : ``} complete`);
                        };

                        r();
                    });

                    res();
                }));
            }

            await Promise.all(iconPromises);

            console.log(`icons done`)
    
            res(icons);
        });

        return getIconsPromise;
    },
    get: (type) => iconGetter(type),
    set: (type) => {
        const { alwaysUseLightIcon } = require(`../getConfig`)();
    
        if(!type) type = current;

        if(type == `noQueue` && global.updateAvailable) type == `update`
        
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