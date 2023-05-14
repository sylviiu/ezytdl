const fs = require('fs');

module.exports = (doNotCheckForUpdates) => new Promise(async res => {
    const { file, getPath } = require(`../util/filenames/ytdlp`);

    console.log(`Looking for file ${file}`);

    if(getPath()) {
        if(doNotCheckForUpdates) return res(true);

        const latestVersion = require(`../util/fetchLatestVersion/ytdlp`);
    
        latestVersion().then(async o => {
            console.log(`Latest version available is ${o.version}`);

            const versionDownloaded = await require(`../util/currentVersion/ytdlp`)(true);

            console.log(`Version downloaded is ${versionDownloaded}`);

            if(versionDownloaded == o.version) {
                return res(true)
            } else {
                return res(false)
            }
        }).catch(e => {
            // It's already downloaded and usable, so if the latest version is unavailable, we can still use it.
            return res(true)
        })
    } else {
        return res(false)
    }
})