module.exports = {
    type: `on`,
    func: () => global.window ? global.window.isMaximized() ? global.window.unmaximize() : global.window.maximize() : null
}