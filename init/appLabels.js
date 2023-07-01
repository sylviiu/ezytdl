module.exports = () => new Promise(res => {
    const { app } = require('electron');

    app.setAppUserModelId(`ezytdl`);

    res(true);
})