const { app, Menu, Tray, nativeImage, nativeTheme, ipcMain } = require('electron');
const sharp = require('sharp');
const fs = require('fs');
const pfs = require('../util/promisifiedFS')
const path = require(`path`);

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

const basePath = path.join(global.configPath, `ezytdl System Icon Cache`);

const createdFilenames = [];

const iconToPNG = (icon, size, negate) => new Promise(async res => {
    const fileName = path.parse(icon).name + `-${size}` + (negate ? `-negate` : `-no-negate`) + `.png`;

    createdFilenames.push(fileName);

    const filePath = path.join(basePath, fileName);

    //if(!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });
    if(!await pfs.existsSync(basePath)) await pfs.mkdirSync(basePath, { recursive: true });

    if(await pfs.existsSync(filePath)) {
        pfs.readFileSync(filePath).then(res).catch(e => {
            pfs.rmSync(filePath).then(() => iconToPNG(icon, size, negate).then(res));
        });
    } else {
        console.log(`creating icon ${filePath}`);
        const sharpIcon = sharp(icon).resize(Math.round(size), Math.round(size));
        if(negate) sharpIcon.negate({ alpha: false });
        const buf = await sharpIcon.png().toBuffer();
        pfs.writeFileSync(filePath, buf).then(() => res(buf));
    }
})

let getIconsPromise = null;
let getIconsComplete = false;

module.exports = {
    on: (...c) => events.on(...c),
    getCurrentType: () => current,
    getCurrentIcon: (useWhite) => iconGetter(current, useWhite),
    getIcons: () => {
        if(getIconsComplete) return Promise.resolve(icons);

        if(!getIconsPromise) getIconsPromise = new Promise(async res => {
            let supportedMultipliers = [ 1, 1.25, 1.33, 1.4, 1.5, 1.8, 2 ];

            if(process.platform == `win32`) supportedMultipliers = [ 1, 1.25, 1.5, 2 ];
            // scales based on https://www.electronjs.org/docs/latest/api/native-image#high-resolution-image
            
            if(process.platform == `linux`) supportedMultipliers = [ 1, 1.25, 1.33, 1.4, 1.5, 1.8, 2, 2.5, 3, 4, 5 ];
            // scales are inconsistent with linux, so we just use all supported

            if(process.platform == `darwin`) supportedMultipliers = [ 1, 2 ]
            // so far as i'm aware, tray icons only use up to 2x on macos

            let sizes = supportedMultipliers.map(m => 16 * m);
    
            console.log(`Getting icons...`)
    
            const createIcon = (iconFile, negate, maxRes) => new Promise(async res => {
                let nativeIcon = null;
    
                console.log(`Creating ${iconFile} / negate: ${negate}`);

                if(maxRes) {
                    const icon = await iconToPNG(iconFile, 512, negate);
                    nativeIcon = nativeImage.createFromBuffer(icon)
                } else {
                    nativeIcon = nativeImage.createEmpty();

                    for(let i in sizes) {
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
                }

                if(process.platform == `darwin` && !maxRes) {
                    console.log(`Setting template image`)
                    nativeIcon.setTemplateImage(true);
                }
    
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

                            await Promise.all([
                                new Promise(async r => {
                                    icons[iconFile + (inv ? `Inv` : ``)] = await createIcon(str, inv);
                                    console.log(`(${Date.now() - starttime}ms) nativeIcon ${iconFile}${inv ? ` (inv)` : ``} complete`);
                                    r();
                                }),
                                new Promise(async r => {
                                    icons[iconFile + (inv ? `Inv` : ``) + `Max`] = await createIcon(str, inv, true);
                                    console.log(`(${Date.now() - starttime}ms) nativeIcon [MAX] ${iconFile}${inv ? ` (inv)` : ``} complete`);
                                    r();
                                }),
                            ])
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

        getIconsPromise.then(async () => {
            for(const filename of await pfs.readdirSync(basePath)) {
                if(!createdFilenames.includes(filename)) {
                    console.log(`Deleting unused icon ${filename}`)
                    await pfs.unlinkSync(path.join(basePath, filename));
                }
            }
        })

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