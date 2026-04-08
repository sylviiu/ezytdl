module.exports = {
    name: `FFmpeg`,
    description: `FFmpeg / FFprobe; used for converting & tagging.`,
    check: (r, current) => new Promise(async (res, rej) => {
        const latestVersion = (r || (await require(`../fetchLatestVersion/ffmpeg`)() || {})).response;
        const currentVersion = current || (await require(`../currentVersion/ffmpeg`)(true, true));

        if(latestVersion) {
            const latestVersionName = (latestVersion.name.match(/[\d*]*\.[\d*]*/) || [latestVersion.name])[0];

            console.log(`LATEST VERSION NAME: ${latestVersionName}`);

            const latestComparableName = latestVersionName.match(/[0-9-]{4,}/)[0].replace(/-/g, '')
        
            if(currentVersion == (latestComparableName || latestVersionName)) {
                return res(false)
            } else {
                return res(latestComparableName || latestVersionName)
            }
        } else rej(`Failed retrieving info.`)
    })
}