module.exports = {
    name: `FFmpeg`,
    description: `FFmpeg / FFprobe; used for converting & tagging.`,
    check: (r, current) => new Promise(async (res, rej) => {
        const latestVersion = (r || (await require(`../fetchLatestVersion/ffmpeg`)() || {})).response;
        const currentVersion = current || (await require(`../currentVersion/ffmpeg`)(true, true));

        if(latestVersion) {
            const latestVersionName = (latestVersion.name.match(/[\d*]*\.[\d*]*/) || [latestVersion.name])[0]
        
            if(currentVersion == latestVersionName) {
                return res(false)
            } else {
                return res(latestVersionName)
            }
        } else rej(`Failed retrieving info.`)
    })
}