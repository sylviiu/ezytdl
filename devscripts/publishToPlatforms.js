const fs = require('fs');

(() => new Promise(async res => {
    console.log(`running platform scripts`);

    const platformScripts = fs.existsSync(`./devscripts/platforms/${process.platform}`) && fs.readdirSync(`./devscripts/platforms/${process.platform}`).filter(f => f.endsWith(`.js`)) || [];

    console.log(`running ${platformScripts.length} platform scripts (${process.platform})`);

    const responses = {};

    for(const file of platformScripts) responses[file] = await (require(`./platforms/${process.platform}/${file}`)());

    res(responses);
}))()