const fs = require('fs');

// dest path: assets/fonts/fontawesome-all.min.css

module.exports = {
    beforePack: () => {
        const cssfile = fs.readFileSync(`./node_modules/@fortawesome/fontawesome-free/css/all.min.css`, `utf8`).replace(/webfonts/g, `fonts`);

        fs.writeFileSync(`./assets/fonts/fontawesome-all.min.css`, cssfile, `utf8`);

        console.log(`minified fontawesome css`);

        if(!fs.existsSync(`./assets/fonts`)) fs.mkdirSync(`./assets/fonts`);

        const fontfiles = fs.readdirSync(`./node_modules/@fortawesome/fontawesome-free/webfonts`);

        for(const fontfile of fontfiles) {
            fs.copyFileSync(`./node_modules/@fortawesome/fontawesome-free/webfonts/${fontfile}`, `./assets/fonts/${fontfile}`);
        }

        console.log(`copied fontawesome fonts`);
    },
}