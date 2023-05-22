module.exports = async () => {
    require(`electron`).app.on(`activate`, () => require(`../core/bringToFront`)());
    // only for mac os
}