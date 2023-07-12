const fs = require('fs');
const child_process = require('child_process');
const uglify = require('uglify-js');

module.exports = (context) => {
    try {
        console.log(`stashing changes...`);
        child_process.execSync(`git stash`);
    } catch(e) {
        console.log(`Failed stashing: ${e}`);
        process.exit(1);
    }

    const dirs = require(`./dirs`);
    
    console.log(`minifying ${dirs.map(o => o.files.length).reduce((a,b) => a + b, 0)} files in ${dirs.length} dirs... (${dirs.map(o => `${o.path} with ${o.files.length} files`).join(`, `)})`);

    dirs.forEach(dir => {
        const overallScript = {};

        dir.files.forEach(file => {
            overallScript[file] = fs.readFileSync(`${dir.path}/${file}`, 'utf8');
            fs.rmSync(`${dir.path}/${file}`);
        });

        const minified = uglify.minify(overallScript, { compress: { drop_console: true } }).code;

        fs.writeFileSync(`${dir.path}/minified.js`, minified, 'utf8');
    });
}