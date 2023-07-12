const fs = require('fs');
const uglify = require('uglify-js');

module.exports = (context) => {
    const dirs = require(`./dirs`);

    const pagescripts = fs.readdirSync(`./html/pagescripts`).filter(f => f.endsWith(`.js`));
    
    console.log(`minifying ${dirs.map(o => o.files.length).reduce((a,b) => a + b, 0)} files in ${dirs.length} dirs... (${dirs.map(o => `${o.path} with ${o.files.length} files`).join(`, `)})`);

    dirs.forEach(dir => {
        const overallScript = {};

        dir.files.forEach(file => {
            overallScript[file] = fs.readFileSync(`${dir.path}/${file}`, 'utf8');
            fs.rmSync(`${dir.path}/${file}`);
        });

        for(const script of pagescripts) {
            const minified = uglify.minify(Object.assign({}, overallScript, { page: fs.readFileSync(`./html/pagescripts/${script}`) }), { compress: { drop_console: true } }).code;
            fs.writeFileSync(`${dir.path}/minified.js`, minified, 'utf8');
            console.log(`created embedded script for ${dir.path} with ${script}`)
        }

        //const minified = uglify.minify(overallScript, { compress: { drop_console: true } }).code;
        //fs.writeFileSync(`${dir.path}/minified.js`, minified, 'utf8');
    });
}