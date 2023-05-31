module.exports = (doNotCheckForUpdates) => new Promise(async res => {
    const { file, getPath } = require(`../util/filenames/ytdlp`);
    const fs = require(`fs`);

    const bridgepath = require(`../util/pythonBridge`).bridgepath;

    if(/*fs.existsSync(bridgepath)*/ true) {
        console.log(`BRIDGE PATH EXISTS.`);
        if(!global.createdBridge) {
            console.log(`creating bridge`)
            require(`../util/pythonBridge`).create().then(() => {
                console.log(`bridge created`)
                return res(true)
            })
        } else return res(true)
    } else {
        console.log(`falling back to binary distribution`)
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
    }
})