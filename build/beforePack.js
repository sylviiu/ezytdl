const fs = require('fs');
const uglify = require('uglify-js');

module.exports = (context) => {
    const dirs = require(`./dirs`);

    const pagescripts = fs.readdirSync(`./html/pagescripts`).filter(f => f.endsWith(`.js`));
    
    console.log(`minifying ${dirs.map(o => o.files.length).reduce((a,b) => a + b, 0)} files in ${dirs.length} dirs... (${dirs.map(o => `${o.path} with ${o.files.length} files`).join(`, `)})`);

    let i = 1;
    let total = dirs.length * pagescripts.length;

    for(const script of pagescripts) {
        dirs.forEach(dir => {
            const overallScript = { page: fs.readFileSync(`./html/pagescripts/${script}`, 'utf8') };
    
            dir.files.forEach(file => {
                overallScript[file] = fs.readFileSync(`${dir.path}/${file}`, 'utf8');
                fs.rmSync(`${dir.path}/${file}`);
            });
            
            const minified = uglify.minify(overallScript, { compress: { drop_console: true } }).code;
            fs.writeFileSync(`./html/pagescripts/${script}`, minified, 'utf8');
            console.log(`created embedded script for ${dir.path} with ${script} (${i++}/${total})`)
    
            //const minified = uglify.minify(overallScript, { compress: { drop_console: true } }).code;
            //fs.writeFileSync(`${dir.path}/minified.js`, minified, 'utf8');
        });

        /*const useScriptObj = Object.assign({}, overallScript, { page: fs.readFileSync(`./html/pagescripts/${script}`, 'utf8') })
        const minified = uglify.minify(useScriptObj, { compress: { drop_console: true } }).code;
        fs.writeFileSync(`./html/pagescripts/${script}`, minified, 'utf8');
        console.log(`created embedded script for ${dir.path} with ${script} (${i++}/${total})`)*/
    }
}