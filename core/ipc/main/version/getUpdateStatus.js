module.exports = {
    type: `handle`,
    func: () => require(`../../../checkForUpdates`).progress,
}