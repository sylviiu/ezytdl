module.exports = {
    type: `on`,
    func: (event, arg) => {
        console.log(arg)

        if(arg == `ytdlp`) {
            return require(`../../../../util/downloadClient/ytdlp`)()
        } else if(arg == `ffmpeg`) {
            return require(`../../../../util/downloadClient/ffmpeg`)()
        } else if(arg == `ezytdl`) {
            return require(`../../../../util/downloadClient/ezytdl`)()
        } else if(arg == `pybridge`) {
            return require(`../../../../util/downloadClient/pybridge`)()
        }
    }
}