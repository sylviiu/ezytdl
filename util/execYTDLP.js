const { getPath } = require(`./filenames/ytdlp`);
const child_process = require(`child_process`);

module.exports = (...args) => {
    const bridge = require(`./pythonBridge`);

    if(bridge.active) {
        
    } else {
        const path = getPath();
        return child_process.execFile(getPath, ...args)
    }
}