module.exports = {
    type: `on`,
    func: () => global.window ? global.window.close() : null
}