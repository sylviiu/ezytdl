const { convert, convertFile } = require('convert-svg-to-png');
const jimp = require(`jimp`)

const fs = require('fs');

const outputFilePath = (type, mult) => `dist/trayIcons/${type}${mult == 1 ? `` : `@` + mult + `x`}.png`;

const createTrayImage = (name, opt, mult) => new Promise(async res => {
    const regularPath = outputFilePath(`${name}`, mult);
    const invertedPath = outputFilePath(`${name}-inv`, mult);

    console.log(`getting buffer of ${name} @ ${opt.width}`)

    const buf = fs.readFileSync('res/trayIcons/' + name + '.svg');
    const png = await convert(buf, opt);
    
    fs.writeFileSync(regularPath, png);

    console.log(`getting inverted buffer of ${name} @ ${opt.width}`)

    const inv = await jimp.read(png);
    inv.invert();
    inv.getBuffer(jimp.MIME_PNG, (err, invBuf) => {
        if(!err) {
            fs.writeFileSync(invertedPath, invBuf);
            res();
        } else throw new Error(`Failed to invert ${name} @ ${opt.width}`, err)
    });
})

module.exports = (context) => new Promise(async res => {
    let sizes = [ 16 ];

    let supportedMultipliers = [ 1, 1.25, 1.33, 1.4, 1.5, 1.8, 2, 2.5, 3, 4, 5 ]
    //https://github.com/electron/electron/blob/main/docs/api/native-image.md#template-image

    for(mult of supportedMultipliers.slice(1)) {
        sizes.push( 16 * mult );
    }

    fs.mkdirSync(`dist/trayIcons`, { recursive: true });

    const icons = fs.readdirSync(`./res/trayIcons`);

    for(const iconFile of icons) {
        const str = iconFile.split(`.`).slice(0, -1).join(`.`);

        if(!fs.existsSync(outputFilePath(str))) {
            for(let i in sizes) {
                const size = sizes[i];
        
                const opt = {
                    width: size,
                    height: size,
                }
                
                await createTrayImage(str, opt, supportedMultipliers[i]);
            };
        } else console.log(`Skipping ${outputFilePath(str)} (already exists)`)
    }

    res(true);
});