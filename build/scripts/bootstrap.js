const fs = require('fs');

// dest path: assets/css/Alata.css
// fonts path: assets/fonts/

module.exports = {
    beforePack: () => {
        if(fs.existsSync(`./html/assets/bootstrap`)) fs.rmSync(`./html/assets/bootstrap`, { recursive: true, force: true });

        fs.mkdirSync(`./html/assets/bootstrap`);
        fs.mkdirSync(`./html/assets/bootstrap/css`);
        fs.mkdirSync(`./html/assets/bootstrap/js`);

        const cssfile = fs.readFileSync(`./node_modules/bootstrap/dist/css/bootstrap.min.css`, `utf8`);
        fs.writeFileSync(`./html/assets/bootstrap/css/bootstrap.min.css`, cssfile);
        console.log(`saved css file`);

        const jsfile = fs.readFileSync(`./node_modules/bootstrap/dist/js/bootstrap.min.js`, `utf8`);
        fs.writeFileSync(`./html/assets/bootstrap/js/bootstrap.min.js`, jsfile);
        console.log(`saved js file`);
    },
}