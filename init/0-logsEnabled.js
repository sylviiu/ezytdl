module.exports = async () => {
    const sendNotification = require(`../core/sendNotification`)
    
    const config = require(`../getConfig`)();
    
    if(config.logsEnabled || global.testrun || global.headless) {
        console.log(`Keeping logs enabled`)
        sendNotification({
            type: `warn`,
            headingText: `Debug logs enabled!`,
            bodyText: `Debug logs are enabled in the config. This most likely will slow down the app.`
        });
        //res(true);
        return true
    } else if(require(`electron`).app.isPackaged) {
        console.log(`Packaged build -- disabling logs for higher speed. (You can still enable them in the config)`);
        console.log = () => {};
        //res(false);
        return false
    } else {
        console.log(`Running from source -- keeping logs enabled.`);
        //res(true);
        return true
    }
}