const fs = require('fs');

module.exports = (context) => {
    const scripts = fs.readdirSync(`./build/scripts/`);

    scripts.forEach(file => {
        console.log(`\n\n----------------- running script ${file}`);
        require(`./scripts/${file}`).afterPack ? require(`./scripts/${file}`).afterPack(context) : null;
    })
}