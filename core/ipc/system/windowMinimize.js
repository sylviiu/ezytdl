module.exports = {
    type: `on`,
    func: () => global.window ? global.window.minimize() : null
}