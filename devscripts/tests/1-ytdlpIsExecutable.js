module.exports = () => new Promise(async (res, rej) => {
    require(`../../util/currentVersion/ytdlp`)(true).then(v => {
        if(typeof v == `string` && v) {
            console.log(`YT-DLP IS EXECUTABLE. "${v}"`)
            res(v)
        } else rej(new Error(`YT-DLP IS NOT EXECUTABLE.`))
    })
})