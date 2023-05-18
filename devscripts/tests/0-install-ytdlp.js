module.exports = () => new Promise(async (res, rej) => {
    require(`../../util/downloadClient/ytdlp`)().then((r) => {
        console.log(`YT-DLP INSTALLED.`)
        res(require(`../../util/filenames/ytdlp`).getPath());
    }).catch(rej)
})