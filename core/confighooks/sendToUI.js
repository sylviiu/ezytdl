module.exports = config => {
    if(global.window && global.window.webContents && global.window.webContents.send) {
        global.window.webContents.send(`configHook`, config);
        console.log(`sent config hook`)
        return true;
    } else {
        console.log(`window not ready!`)
        return false;
    };
};