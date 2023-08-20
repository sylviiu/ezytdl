const sharp = require('sharp');
const pfs = require('../../util/promisifiedFS')
const path = require(`path`);

const svgPath = path.join(__dirname, `..`, `..`, `node_modules`, `@fortawesome`, `fontawesome-free`, `svgs`);

const basePath = `./res/trayIcons`

const iconToPNG = (name, icon, size, negate) => new Promise(async res => {
    const fileName = name + (size == 512 ? `-max` : ``) + (negate ? `-light` : `-dark`) + (size == 512 ? `` : `@${size/16}x`) + `.png`;

    const filePath = path.join(basePath, fileName);

    if(!await pfs.existsSync(basePath)) await pfs.mkdirSync(basePath, { recursive: true });

    console.log(`creating icon ${filePath}`);
    const inputBuffer = await pfs.readFileSync(icon);
    const sharpIcon = sharp(inputBuffer).resize(Math.round(size), Math.round(size));
    if(negate) sharpIcon.negate({ alpha: false });
    const buf = await sharpIcon.png().toBuffer();
    await pfs.writeFileSync(filePath, buf).then(() => res(filePath));
});

module.exports = {
    icons: {
        noQueue: `regular/circle-down.svg`,
        active: `solid/circle-down.svg`,
        complete: `solid/circle-check.svg`,
        mixed: `solid/circle-dot.svg`,
        errored: `solid/circle-xmark.svg`,
        update: `solid/circle-up.svg`,
    },
    beforePack: () => new Promise(async res => {
        if(await pfs.existsSync(basePath)) await pfs.rmSync(basePath, { recursive: true });

        let supportedMultipliers = [ 1, 1.25, 1.33, 1.4, 1.5, 1.8, 2 ];

        if(process.platform == `win32`) supportedMultipliers = [ 1, 1.25, 1.5, 2 ];
        // scales based on https://www.electronjs.org/docs/latest/api/native-image#high-resolution-image
        
        if(process.platform == `linux`) supportedMultipliers = [ 1, 1.25, 1.33, 1.4, 1.5, 1.8, 2, 2.5, 3, 4, 5 ];
        // scales are inconsistent with linux, so we just use all supported

        if(process.platform == `darwin`) supportedMultipliers = [ 1, 2 ];
        // so far as i'm aware, tray icons only use up to 2x on macos

        let sizes = supportedMultipliers.map(m => 16 * m);

        console.log(`Getting icons... (${process.platform} sizes: ${sizes.join(`, `)})`)

        const createIcon = (name, iconFile, negate, maxRes) => new Promise(async res => {
            console.log(`Creating ${iconFile} / negate: ${negate}`);

            let path = null;

            if(maxRes) {
                path = await iconToPNG(name.replace(`/`, `-`), iconFile, 512, negate);
            } else {
                path = {};
                for(const size of sizes) path[`${Math.round(size)}`] = await iconToPNG(name.replace(`/`, `-`), iconFile, size, negate);
            }

            res(path);
        });

        const iconJSON = {};

        const iconPromises = [];

        const iconKeys = [...Object.keys(module.exports.icons).map(k => k + `Inv`), ...Object.keys(module.exports.icons)];

        const chunkSize = Math.ceil(iconKeys.length / require('os').cpus().length);

        for(let i = 0; i < iconKeys.length; i += chunkSize) {
            const chunk = iconKeys.slice(i, i + chunkSize);
            console.log(chunk)
            iconPromises.push(new Promise(async res => {    
                const starttime = Date.now();

                for(let iconFile of chunk) await new Promise(async r => {
                    let inv = iconFile.endsWith(`Inv`);

                    if(inv) iconFile = iconFile.slice(0, -3);

                    if(typeof module.exports.icons[iconFile] == `string`) {
                        const str = path.join(svgPath, module.exports.icons[iconFile]);

                        await Promise.all([
                            new Promise(async r => {
                                iconJSON[iconFile + (inv ? `Inv` : ``)] = await createIcon(iconFile, str, inv);
                                console.log(`(${Date.now() - starttime}ms) nativeIcon ${iconFile}${inv ? ` (inv)` : ``} complete`);
                                r();
                            }),
                            new Promise(async r => {
                                iconJSON[iconFile + (inv ? `Inv` : ``) + `Max`] = await createIcon(iconFile, str, inv, true);
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

        console.log(`icons done, writing JSON`, iconJSON);
        
        await pfs.writeFileSync(path.join(basePath, `icons.json`), JSON.stringify(iconJSON, null, 4));

        console.log(`JSON written`);

        res();
    })
}