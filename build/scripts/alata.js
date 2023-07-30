const fs = require('fs');

// dest path: assets/css/Alata.css
// fonts path: assets/fonts/

module.exports = {
    beforePack: () => {
        const cssfile = fs.readFileSync(`./node_modules/@fontsource/alata/index.css`, `utf8`).replace(/url\(\.\/files\//g, `url(../fonts/`);

        fs.writeFileSync(`./html/assets/css/Alata.css`, cssfile, `utf8`);

        console.log(`minified Alata css`);

        if(!fs.existsSync(`./html/assets/fonts`)) fs.mkdirSync(`./html/assets/fonts`);

        const fontfiles = fs.readdirSync(`./node_modules/@fontsource/alata/files`);

        for(const fontfile of fontfiles) {
            fs.copyFileSync(`./node_modules/@fontsource/alata/files/${fontfile}`, `./html/assets/fonts/${fontfile}`);
        }

        console.log(`copied Alata fonts`);
    },
}