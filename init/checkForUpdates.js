module.exports = () => new Promise(async r => {
    r(null);
    if(!global.testrun || !require(`electron`).app.isPackaged) require(`../core/checkForUpdates`)();
})