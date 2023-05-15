const createDialog = require(`./createDialog`);

module.exports = (msg) => {
    createDialog(`error`, `Failed to finish startup process!`, msg);
    global.quitting = true;
    return app.quit()
}