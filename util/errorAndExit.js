const createDialog = require(`./createDialog`);

const { app } = require('electron');

module.exports = (msg) => {
    if(!app.isReady() || global.testrun) {
        console.error(`APP NOT READY, HERE'S AN ERROR LOG`, msg);
        process.exit(1);
    } else {
        createDialog(`error`, `Failed to finish startup process!`, typeof msg == `object` ? JSON.stringify(msg, null, 4) : msg);
        global.quitting = true;
        //return app.quit()
    }
}