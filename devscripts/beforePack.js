const fs = require('fs');

module.exports = () => new Promise(async res => {
    const prebuildscripts = fs.readdirSync(`./devscripts/pre-build/`).filter(s => s.endsWith(`.js`));

    for(const script of prebuildscripts) try {
        const func = require(`./pre-build/${script}`);
        console.log(`Running pre-build ${script}...`);
        await func();
        console.log(`Completed pre-build ${script}!`);
    } catch(e) {
        console.error(`Failed pre-build ${script}: ${e}`)
    };

    res();
});