module.exports = {
    name: `ezytdl pybridge`,
    description: `basically yt-dlp, but bridged for speed for ezytdl.`,
    check: (r, current) => new Promise(async (res, rej) => {
        const latestVersion = (r || (await require(`../fetchLatestVersion/pybridge`)() || {})).response;
        const currentVersion = current || (await require(`../currentVersion/pybridge`)(true));

        if(latestVersion) {
            const latestVersionName = latestVersion.tag_name
        
            if(currentVersion == latestVersionName) {
                return res(false)
            } else {
                return res(latestVersionName)
            }
        } else rej(`Failed retrieving info.`)
    })
}