module.exports = {
    type: `on`,
    func: () => global.updateFunc ? global.updateFunc() : null
}