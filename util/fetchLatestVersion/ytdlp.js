module.exports = () => new Promise(async (res, rej) => {
    const { ytdlpNightlyBuilds } = await require(`../../getConfig`)();
    const repo = ytdlpNightlyBuilds ? `yt-dlp-nightly-builds` : `yt-dlp`

    console.log(`Downloading release from ${repo} (nightly builds: ${ytdlpNightlyBuilds})`)

    return require(`../githubReleasesRequest`)(`yt-dlp`, repo).then(res).catch(rej)
})