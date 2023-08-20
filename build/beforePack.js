const fs = require('fs');

module.exports = (context) => new Promise(async res => {
    const scripts = fs.readdirSync(`./build/scripts/`);

    for(const file of scripts) {
        console.log(`\n\n----------------- running script ${file}`);
        await require(`./scripts/${file}`).beforePack ? require(`./scripts/${file}`).beforePack(context) : null;
    }

    res();
})