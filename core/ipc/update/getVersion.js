module.exports = {
    type: `handle`,
    func: (_e, name) => {
        if(require('fs').existsSync(`./util/currentVersion/${name}.js`)) {
            return require(`../../../util/currentVersion/${name}`)(false, true)
        } else return null;
    }
}