module.exports = {
    type: `handle`,
    func: () => new Promise(r => require(`../../../../util/filenames/ffmpeg`).getFFprobePromise().then(r))
}