module.exports = {
    type: `on`,
    func: (event, arg) => {
        console.log(arg)

        if(arg == `ytdlp`) {
            return require(`../../../util/downloadClient/ytdlp`)()
        } else if(arg == `ffmpeg`) {
            return require(`../../../util/downloadClient/ffmpeg`)()
        }
    }
}