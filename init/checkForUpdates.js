module.exports = () => new Promise(async r => {
    r(null);
    require(`../core/checkForUpdates`)();
})