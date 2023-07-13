const fs = require('fs');
const uglify = require('uglify-js');

module.exports = {
    beforePack: () => {
        const pagescripts = fs.readdirSync(`./html/pagescripts`).filter(f => f.endsWith(`.js`));

        console.log(`minifying ${pagescripts.length} pagescripts`);
        
        if(fs.existsSync(`./html/pagescripts/etc`)) fs.rmdirSync(`./html/pagescripts/etc`, { recursive: true });
        
        fs.mkdirSync(`./html/pagescripts/etc`);
    
        pagescripts.forEach(file => {
            const script = fs.readFileSync(`./html/pagescripts/${file}`, 'utf8');
            const minified = uglify.minify(script, { compress: { drop_console: true } }).code;
            if(!fs.existsSync(`./html/pagescripts/etc`)) fs.mkdirSync(`./html/pagescripts/etc`);
            fs.renameSync(`./html/pagescripts/${file}`, `./html/pagescripts/etc/${file}`);
            fs.writeFileSync(`./html/pagescripts/${file}`, minified, 'utf8');
        });
    },
    afterPack: () => {
        const pagescripts = fs.readdirSync(`./html/pagescripts/etc`);
    
        pagescripts.forEach(file => {
            fs.renameSync(`./html/pagescripts/etc/${file}`, `./html/pagescripts/${file}`);
        })
    }
}