module.exports = () => new Promise(async (res, rej) => {
    require(`../../util/currentVersion/ffmpeg`)(true).then(v => {
        if(typeof v == `string`) {
            res(v)
        } else rej(`FFMPEG IS NOT EXECUTABLE.`)
    })
})