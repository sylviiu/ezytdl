const fs = require('fs');

module.exports = () => new Promise(async res => {
    const { file, getPath } = require(`../util/filenames/ffmpeg`);

    console.log(`Looking for file ${file}`)
    
    if(getPath()) {
        const latestVersion = require(`../util/fetchLatestVersion/ffmpeg`);
    
        latestVersion().then(async o => {
            if(!o || o.error) return res(true);

            console.log(`Latest version available is ${o.version}`);

            const versionDownloaded = await require(`../util/currentVersion/ffmpeg`)(true);

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