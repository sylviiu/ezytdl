const fs = require('fs');
const uglify = require('uglify-js');

const parseIconFile = (file) => JSON.parse(`{${file.split(`var icons = {`)[1].split(`};`)[0].split(`\n`).filter(l => l.trim().length > 0).map(l => (l.split(`:`)[0] + `: true`).trim()).join(`,\n`)}}`)

// dest path: assets/fonts/fontawesome-all.min.css

module.exports = {
    beforePack: () => {
        const cssfile = fs.readFileSync(`./node_modules/@fortawesome/fontawesome-free/css/all.min.css`, `utf8`).replace(/webfonts/g, `fonts`);

        fs.writeFileSync(`./html/assets/fonts/fontawesome-all.min.css`, cssfile, `utf8`);

        console.log(`minified fontawesome css`);

        if(!fs.existsSync(`./html/assets/fonts`)) fs.mkdirSync(`./html/assets/fonts`);

        const fontfiles = fs.readdirSync(`./node_modules/@fortawesome/fontawesome-free/webfonts`);

        for(const fontfile of fontfiles) {
            fs.copyFileSync(`./node_modules/@fortawesome/fontawesome-free/webfonts/${fontfile}`, `./html/assets/fonts/${fontfile}`);
        }

        console.log(`copied fontawesome fonts`);

        const faTypes = {
            fas: parseIconFile(fs.readFileSync(`./node_modules/@fortawesome/fontawesome-free/js/solid.js`, `utf8`)),
            far: parseIconFile(fs.readFileSync(`./node_modules/@fortawesome/fontawesome-free/js/regular.js`, `utf8`)),
            fab: parseIconFile(fs.readFileSync(`./node_modules/@fortawesome/fontawesome-free/js/brands.js`, `utf8`)),
        };
        
        console.log(faTypes);

        const faIconExists = (faType, name, returnIcon, iconStyle) => {
            if(faType && typeof faType == `string`) {
                const exists = faTypes[faType]?.[name] ? true : false;
        
                if(exists && returnIcon) {
                    const tempElement = document.createElement(`i`);
                    
                    tempElement.className = `${faType} fa-${name}`;
            
                    if(iconStyle) for(const key of Object.keys(iconStyle)) {
                        tempElement.style[key] = iconStyle[key];
                    }
            
                    return tempElement;
                } else return exists;
            } else {
                const fallbacks = Array.isArray(faType) && faType || [`fas`, `far`, `fab`]
        
                const found = fallbacks.map(f => faIconExists(f, name, returnIcon, iconStyle));
        
                return found.find(Boolean) || false;
            }
        };
        
        const str = `var faTypes = ${JSON.stringify(faTypes)}; var faIconExists = ${faIconExists.toString()};`
        fs.writeFileSync(`./html/topjs/faIconExists.js`, uglify.minify(str, { compress: { drop_console: true } }).code, `utf8`);

        console.log(`created & minified faIconExists.js`);
    },
}