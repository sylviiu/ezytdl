module.exports = () => new Promise(async (res, rej) => {
    require(`../../util/currentVersion/ffmpeg`)(true).then(v => {
        if(typeof v == `string` && v) {
            console.log(`FFMPEG IS EXECUTABLE. "${v}"`)
            res(v)
        } else rej(new Error(`FFMPEG IS NOT EXECUTABLE.`))
    })
})