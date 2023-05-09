const fs = require('fs');

module.exports = () => new Promise(async res => {
    const { file } = require(`../util/filenames/ytdlp`);

    console.log(`Looking for file ${file}`)
    
    if(fs.existsSync(`${global.configPath}/${file}`)) {
        const latestVersion = require(`../util/fetchLatestVersion/ytdlp`);
    
        latestVersion().then(async o => {
            console.log(`Latest version available is ${o.version}`);

            const versionDownloaded = await require(`../util/currentDownloadedVersion`)(true);

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