module.exports = {
    type: `on`,
    func: () => require(`../../../util/downloadManager`).default.refreshAll()
}