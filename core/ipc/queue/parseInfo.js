module.exports = {
    type: `handle`,
    func: (_e, info) => require(`../../../util/ytdlp`).parseInfo(info)
}