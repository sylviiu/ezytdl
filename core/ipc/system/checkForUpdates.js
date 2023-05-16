module.exports = {
    type: `handle`,
    func: () => global.updateCheckResult && global.updateCheckResult.version != require(`../../../package.json`).version ? true : false
}