module.exports = () => {
    const fs = require('fs');

    const obj = {
        util: fs.readdirSync(`./html/util`).filter(f => f.endsWith(`.js`)),
        topjs: fs.readdirSync(`./html/topjs`).filter(f => f.endsWith(`.js`)),
        afterload: fs.readdirSync(`./html/afterload`).filter(f => f.endsWith(`.js`)),
    }

    console.log(obj)

    fs.writeFileSync(`./core/build-assets.json`, JSON.stringify(obj, null, 4))
}