const fs = require('fs');

module.exports = (doNotCheckForUpdates) => new Promise(async res => {
    const { file, getPath } = require(`../util/filenames/ytdlp`);
    const fs = require(`fs`);

    await require(`../util/filenames/python`).getPaths();
    
    const { pythonPath, pyenvPath, bindir } = require(`../util/filenames/python`);

    if(global.useBridge && pythonPath) {
        console.log(`using python distributions!`)
        console.log(`pythonPath: ${pythonPath}\npyenvPath: ${pyenvPath}\nbindir: ${bindir}`)

        if(!fs.existsSync(bindir)) {
            console.log(`DOES NOT EXIST.`)
            return res(false)
        } else {
            console.log(`EXISTS.`);
            if(!global.createdBridge) {
                console.log(`creating bridge`)
                require(`../util/pythonBridge`).create().then(() => {
                    console.log(`bridge created`)
                    return res(true)
                })
            } else return res(true)
        }
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