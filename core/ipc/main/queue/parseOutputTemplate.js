module.exports = {
    type: `handle`,
    func: (_e, arg) => require(`../../../../util/ytdlp`).parseOutputTemplate(...arg)
}