module.exports = {
    type: `handle`,
    func: () => new Promise(r => require(`../../../../util/filenames/ffmpeg`).getPathPromise().then(r))
}