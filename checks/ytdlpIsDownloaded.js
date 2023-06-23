module.exports = (doNotCheckForUpdates) => new Promise(async res => {
    const { getPath } = require(`../util/filenames/pybridge`);

    const path = getPath();

    const spawnBridge = async () => {
        console.log(`BRIDGE PATH EXISTS.`);

        if(!doNotCheckForUpdates) await new Promise(async r => {
            latestVersion().then(async o => {
                console.log(`Latest version available is ${o.version}`);

                const versionDownloaded = await require(`../util/currentVersion/ytdlp`)(true);

                console.log(`Version downloaded is ${versionDownloaded}`);

                if(versionDownloaded == o.version) {
                    return r();
                } else {
                    return res(false)
                }
            });
        })

        if(!global.createdBridge) {
            console.log(`creating bridge`)
            require(`../util/pythonBridge`).create().then(() => {
                console.log(`bridge created`)
                return res(true)
            })
        } else return res(true)
    }

    if(path) {
        spawnBridge();
    } else res(false);
})