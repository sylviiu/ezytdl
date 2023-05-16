global.ldconfig = require(`child_process`).execFileSync(`ldconfig`, [`-p`]).toString();

module.exports = (name) => {
    if(global.ldconfig && `${global.ldconfig}`.includes(module.exports.name)) {
        return true
    } else {
        return false
    }
}