const createDialog = require(`./createDialog`);

const { app } = require('electron');

module.exports = (msg) => {
    createDialog(`error`, `Failed to finish startup process!`, msg);
    global.quitting = true;
    return app.quit()
}