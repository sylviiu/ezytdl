module.exports = {
    type: `handle`,
    func: () => require(`../../../util/filenames/ffmpeg`).getFFprobe()
}