const createDialog = require(`./createDialog`);

const { app } = require('electron');

module.exports = (msg) => {
    createDialog(`error`, `Failed to finish startup process!`, typeof msg == `object` ? JSON.stringify(msg, null, 4) : msg);
    global.quitting = true;
    //return app.quit()
}