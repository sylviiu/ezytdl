const createDialog = require(`./createDialog`);

module.exports = (msg) => {
    createDialog(`error`, `Failed to finish startup process!`, msg);
    return app.quit()
}