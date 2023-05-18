module.exports = () => new Promise(async res => {
    const initStart = Date.now();

    console.log(`Initializing...`);

    //const initScripts = require('fs').readdirSync(`./init/`);
    const initScripts = [`0-logsEnabled.js`, `appLabels.js`, `checkForUpdates.js`, `createTray.js`, `statusIcons.js`, `ytdlpDownloaded.js`]

    console.log(`Scripts: ${initScripts.join(`, `)}`)

    const scripts = [];

    for(const file of initScripts) {
        try {
            scripts.push(new Promise(async res => {
                const start = Date.now();

                console.log(`Running init script ${file}...`)

                const result = await require(`./init/${file}`)();

                console.log(`init script ${file} completed in ${Date.now() - start}ms`)

                return res({
                    script: file.split(`.`).slice(0, -1).join(`.`),
                    time: Date.now() - start,
                    result
                });
            }));
        } catch(e) {
            console.log(`Failed to run init script ${file}! -- ${e}`);
        }
    };

    const times = await Promise.all(scripts);

    console.log(times.map(o => `${o.script} / ${o.time}ms`));

    let obj = {};

    for(const script of times) {
        obj[script.script] = script.result;
    };

    console.log(`Completed init scripts in ${Date.now() - initStart}ms`)

    return res(obj);
})