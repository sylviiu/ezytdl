const fs = require('fs');
const uglify = require('uglify-js');

const scripts = {
    animejs: `./node_modules/animejs/lib/anime.min.js`,
    showdown: `./node_modules/showdown/dist/showdown.min.js`,
    tinycolor2: `./node_modules/tinycolor2/dist/tinycolor-min.js`,
    colorscheme: `./node_modules/color-scheme/lib/color-scheme.min.js`,
}

module.exports = {
    beforePack: () => {
        for(const key of Object.keys(scripts)) {
            console.log(`minifying script ${key}`);
            scripts[key] = fs.readFileSync(scripts[key], `utf8`);
        };

        console.log(`creating minified script ./html/lib/main.js`);

        if(!fs.existsSync(`./html/lib`)) fs.mkdirSync(`./html/lib`);

        fs.writeFileSync(`./html/lib/minified.js`, uglify.minify(scripts).code);
    }
}