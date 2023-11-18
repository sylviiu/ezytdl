const fs = require('fs');

module.exports = {
    afterPack: (context) => new Promise(async res => {
        const platformScripts = fs.existsSync(`./build/scripts/platforms/${process.platform}`) && fs.readdirSync(`./build/scripts/platforms/${process.platform}`) || [];

        console.log(`running ${platformScripts.length} platform scripts (${process.platform})`);

        const responses = {};

        for(const file of platformScripts) responses[file] = await (require(`./platforms/${process.platform}/${file}`)(context));

        res(responses);
    }),
}