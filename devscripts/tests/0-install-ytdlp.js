module.exports = () => new Promise(async (res, rej) => {
    require(`../../util/downloadClient/pybridge`)().then((r) => {
        console.log(`YT-DLP INSTALLED.`)
        res(require(`../../util/filenames/pybridge`).getPath());
    }).catch(rej)
})