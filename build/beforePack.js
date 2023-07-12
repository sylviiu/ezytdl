const fs = require('fs');
const uglify = require('uglify-js');

const blacklistedDirs = [`assets`]

module.exports = (context) => {
    const dirs = fs.readdirSync(`./html`).filter(f => !f.endsWith(`.html`) && blacklistedDirs.indexOf(f) === -1).map(f => ({ path: `./html/${f}`, files: fs.readdirSync(`./html/${f}`).filter(f2 => f2.endsWith(`.js`)) }));
    console.log(`minifying ${dirs.map(o => o.files.length).reduce((a,b) => a + b, 0)} files in ${dirs.length} dirs... (${dirs.map(o => `${o.path} with ${o.files.length} files`).join(`, `)})`);

    dirs.forEach(dir => {
        const overallScript = [];

        dir.files.forEach(file => {
            overallScript.push(fs.readFileSync(`${dir.path}/${file}`, 'utf8'));
            fs.rmSync(`${dir.path}/${file}`);
        });

        const minified = uglify.minify(overallScript.join(`\n`), { compress: { drop_console: true } }).code;

        fs.writeFileSync(`${dir.path}/minified.js`, minified, 'utf8');
    });
}