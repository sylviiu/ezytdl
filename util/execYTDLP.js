const { getPath } = require(`./filenames/ytdlp`);
const child_process = require(`child_process`);
const wsprocess = require(`./class/wsprocess`);

module.exports = (...args) => {
    const bridge = require(`./pythonBridge`);

    if(bridge.active) {
        return new wsprocess(...args)
    } else {
        return child_process.execFile(getPath(), ...args)
    }
}