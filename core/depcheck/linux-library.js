module.exports = (name) => {
    try {
        if(!global.ldconfig) global.ldconfig = require(`child_process`).execFileSync(`ldconfig`, [`-p`]).toString().split(`\n\t`).map(s => s.split(` `)[0]);
        
        const included = global.ldconfig && global.ldconfig.find(s => s == module.exports.name)
        console.log(`checking for ${name} | ${included}`)
        if(included) {
            return true
        } else {
            return false
        }
    } catch(e) {
        console.log(`ldconfig not found, continuing`)
    }
}