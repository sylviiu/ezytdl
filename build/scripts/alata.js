const fs = require('fs');

// dest path: assets/css/Alata.css
// fonts path: assets/fonts/

module.exports = {
    beforePack: () => {
        const cssfile = fs.readFileSync(`./node_modules/@fontsource/alata/index.css`, `utf8`).replace(/url\(\.\/files\//g, `url(../fonts/`);

        fs.writeFileSync(`./assets/css/Alata.css`, cssfile, `utf8`);

        console.log(`minified Alata css`);

        if(!fs.existsSync(`./assets/fonts`)) fs.mkdirSync(`./assets/fonts`);

        const fontfiles = fs.readdirSync(`./node_modules/@fontsource/alata/files`);

        for(const fontfile of fontfiles) {
            fs.copyFileSync(`./node_modules/alata/fonts/${fontfile}`, `./assets/fonts/${fontfile}`);
        }

        console.log(`copied Alata fonts`);
    },
}