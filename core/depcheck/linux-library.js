global.ldconfig = require(`child_process`).execFileSync(`ldconfig`, [`-p`]).toString().split(`\n\t`).map(s => s.split(` `)[0]);

module.exports = (name) => {
    const included = global.ldconfig && global.ldconfig.find(s => s == module.exports.name)
    console.log(`checking for ${name} | ${included}`)
    if(included) {
        return true
    } else {
        return false
    }
}