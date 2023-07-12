const fs = require('fs');

module.exports = (context) => {
    const dirs = require(`./dirs`);

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