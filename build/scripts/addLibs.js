const fs = require('fs');

module.exports = {
    scripts: {
        animejs: `./node_modules/animejs/lib/anime.min.js`,
        showdown: `./node_modules/showdown/dist/showdown.min.js`,
        tinycolor: `./node_modules/tinycolor2/dist/tinycolor-min.js`,
        "color-scheme": `./node_modules/color-scheme/lib/color-scheme.min.js`,
    },
    beforePack: () => {
        for(const key of Object.keys(module.exports.scripts)) {
            console.log(`minifying script ${key}`);
            module.exports.scripts[key] = fs.readFileSync(module.exports.scripts[key], `utf8`);
        };

        console.log(`creating minified script ./html/lib/main.js`);

        fs.writeFileSync(`./html/lib.js`, Object.entries(module.exports.scripts).map(([key, value]) => `// ${key}\n${value}`).join(`\n\n`), `utf8`);
    },
    afterPack: () => {
        if(fs.existsSync(`./html/lib.js`)) {
            console.log(`removing minified script ./html/lib.js`);
            fs.rmSync(`./html/lib.js`);
        } else console.log(`minified script ./html/lib.js not found`);
    }
}