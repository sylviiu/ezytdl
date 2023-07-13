const fs = require('fs');
const uglify = require('uglify-js');

const blacklistedDirs = [`assets`, `pagescripts`, `core`, `lib`];

const dirs = fs.readdirSync(`./html`).filter(f => !f.endsWith(`.html`) && blacklistedDirs.indexOf(f) === -1).map(f => ({ path: `./html/${f}`, files: fs.readdirSync(`./html/${f}`).filter(f2 => f2 != `minified.js` && f2.endsWith(`.js`)) }));

module.exports = {
    beforePack: () => {
        console.log(`minifying ${dirs.map(o => o.files.length).reduce((a,b) => a + b, 0)} files in ${dirs.length} dirs... (${dirs.map(o => `${o.path} with ${o.files.length} files`).join(`, `)})`);
    
        dirs.forEach(dir => {
            if(fs.existsSync(`${dir.path}/etc`)) fs.rmdirSync(`${dir.path}/etc`, { recursive: true });
        
            fs.mkdirSync(`${dir.path}/etc`);
    
            const overallScript = {};
    
            dir.files.forEach(file => {
                console.log(`minifying ${dir.path}/${file}`);
                overallScript[file] = fs.readFileSync(`${dir.path}/${file}`, 'utf8');
                fs.renameSync(`${dir.path}/${file}`, `${dir.path}/etc/${file}`);
            });
    
            const minified = uglify.minify(overallScript, { compress: { drop_console: true } }).code;
    
            fs.writeFileSync(`${dir.path}/minified.js`, minified, 'utf8');
        });
    },
    afterPack: () => {
        console.log(`removing ${dirs.map(o => o.files.length).reduce((a,b) => a + b, 0)} minified files in ${dirs.length} dirs... (${dirs.map(o => `${o.path} with ${o.files.length} files`).join(`, `)})`);
    
        dirs.forEach(dir => {
            try {
                fs.rmSync(`${dir.path}/minified.js`);
                console.log(`removed file ${dir.path}/minified.js`);
    
                fs.readdirSync(`${dir.path}/etc`).forEach(file => {
                    fs.renameSync(`${dir.path}/etc/${file}`, `${dir.path}/${file}`);
                    console.log(`restored file ${dir.path}/etc/${file} to ${dir.path}/${file}`);
                });
            } catch(e) {
                console.log(`Failed removing file ${dir.path}/minified.js: ${e}`);
            }
        });
    }
}