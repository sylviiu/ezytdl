const fs = require('fs');
const uglify = require('uglify-js');

module.exports = (context) => {
    const dirs = require(`./dirs`);
    
    console.log(`minifying ${dirs.map(o => o.files.length).reduce((a,b) => a + b, 0)} files in ${dirs.length} dirs... (${dirs.map(o => `${o.path} with ${o.files.length} files`).join(`, `)})`);

    if(fs.existsSync(`${dir.path}/etc`)) fs.rmdirSync(`${dir.path}/etc`, { recursive: true });

    fs.mkdirSync(`${dir.path}/etc`);

    dirs.forEach(dir => {
        const overallScript = {};

        dir.files.forEach(file => {
            overallScript[file] = fs.readFileSync(`${dir.path}/${file}`, 'utf8');
            fs.renameSync(`${dir.path}/${file}`, `${dir.path}/etc/${file}`);
        });

        const minified = uglify.minify(overallScript, { compress: { drop_console: true } }).code;

        fs.writeFileSync(`${dir.path}/minified.js`, minified, 'utf8');
    });

    const pagescripts = fs.readdirSync(`./html/pagescripts`).filter(f => f.endsWith(`.js`));
    
    if(fs.existsSync(`./html/pagescripts/etc`)) fs.rmdirSync(`./html/pagescripts/etc`, { recursive: true });
    
    fs.mkdirSync(`./html/pagescripts/etc`);

    pagescripts.forEach(file => {
        const script = fs.readFileSync(`./html/pagescripts/${file}`, 'utf8');
        const minified = uglify.minify(script, { compress: { drop_console: true } }).code;
        if(!fs.existsSync(`./html/pagescripts/etc`)) fs.mkdirSync(`./html/pagescripts/etc`);
        fs.renameSync(`./html/pagescripts/${file}`, `./html/pagescripts/etc/${file}`);
        fs.writeFileSync(`./html/pagescripts/${file}`, minified, 'utf8');
    })
}