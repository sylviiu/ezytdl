const { nativeImage, nativeTheme, ipcMain } = require('electron');
const pfs = require('../util/promisifiedFS')
const path = require(`path`);

let current = `regular`;

const getPath = require(`../util/getPath`)

const icons = require(`../res/trayIcons/icons.json`);

const events = new (require(`events`).EventEmitter)();

let currentIcon = icons.noQueue;
events.on(`icon`, i => currentIcon = i);

const iconGetter = (type, alwaysUseLightIcon, maxRes) => {
    let useDark = nativeTheme.shouldUseDarkColors;

    if(alwaysUseLightIcon === true) useDark = true;
    if(alwaysUseLightIcon === false) useDark = false;

    if(!icons[type]) type = global.updateAvailable ? `update` : `noQueue`;

    if(useDark) {
        console.log(`getting ${type} light`);
        return icons[type + `Inv` + (maxRes ? `Max` : ``)]
    } else {
        console.log(`getting ${type} dark`);
        return icons[type + (maxRes ? `Max` : ``)]
    }
};

let getIconsPromise = null;
let getIconsComplete = false;

module.exports = {
    on: (...c) => events.on(...c),
    getCurrentType: () => current,
    getCurrentIcon: (useWhite) => iconGetter(current, useWhite),
    getIcons: () => {
        if(getIconsComplete) return Promise.resolve(icons);

        if(!getIconsPromise) getIconsPromise = new Promise(async res => {        
            console.log(`Getting icons...`)
    
            const createIcon = (iconFile) => new Promise(async res => {
                let nativeIcon = null;

                if(typeof iconFile == `string`) {
                    const path = await getPath(`./${iconFile}`, false, false, true);
                    const icon = await pfs.readFileSync(path);
                    nativeIcon = nativeImage.createFromBuffer(icon)
                } else {
                    nativeIcon = nativeImage.createEmpty();

                    const sizes = Object.keys(iconFile).map(Number);

                    for(const size of sizes) {
                        console.log(`getting size ${size}`);
                        const path = await getPath(`./${iconFile[`${size}`]}`, false, false, true);
                        const icon = await pfs.readFileSync(path);
        
                        if(nativeIcon) {
                            nativeIcon.addRepresentation({
                                scaleFactor: size/16,
                                width: size,
                                height: size,
                                buffer: icon
                            });
                        } else {
                            nativeIcon = nativeImage.createFromBuffer(icon);
                        };

                        console.log(`next!`)
                    };
                }

                if(process.platform == `darwin` && typeof iconFile == `object`) {
                    console.log(`Setting template image`)
                    nativeIcon.setTemplateImage(true);
                }
    
                res(nativeIcon);
            });

            const iconPromises = [];
            
            for(const [ name, path ] of Object.entries(icons)) iconPromises.push(new Promise(async res => {
                const nativeIcon = await createIcon(path);

                icons[name] = nativeIcon;

                res();
            }))

            await Promise.all(iconPromises);

            console.log(`icons done`);

            getIconsComplete = true;
    
            res(icons);
        });

        return getIconsPromise;
    },
    get: (...content) => iconGetter(...content),
    set: (type) => {
        if(!type) type = current;

        if(type == `noQueue` && global.updateAvailable) type = `update`

        require(`../getConfig`)().then(({ alwaysUseLightIcon }) => {            
            console.log(`Updating tray -- type: ${type} / use dark colors? ${nativeTheme.shouldUseDarkColors} / force light? ${alwaysUseLightIcon}`);
            
            events.emit(`icon`, iconGetter(type));
            events.emit(`lightIcon`, iconGetter(type, true));
            events.emit(`darkIcon`, iconGetter(type, false));
            events.emit(`iconType`, type);
    
            current = type
        })
    }
};

nativeTheme.on(`updated`, () => module.exports.set());
ipcMain.on(`dark-mode:system`, () => module.exports.set());