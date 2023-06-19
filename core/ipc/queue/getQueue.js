module.exports = {
    type: `handle`,
    func: () => require(`../../../util/downloadManager`).default.queue
}