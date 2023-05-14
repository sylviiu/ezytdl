module.exports = {
    type: `handle`,
    func: () => require(`../../../util/downloadManager`).refreshAll()
}