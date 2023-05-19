module.exports = {
    type: `handle`,
    func: () => new Promise(r => global.updateAvailable ? r(true) : r(false))
}