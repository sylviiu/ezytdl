module.exports = {
    type: `handle`,
    func: () => require(`../../../util/ytdlp`).hasFFmpeg()
}