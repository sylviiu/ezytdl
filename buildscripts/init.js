module.exports = () => {
    const fs = require('fs');
    fs.writeFileSync(`./build-init.json`, JSON.stringify(fs.readdirSync(`./init/`), null, 4))
}