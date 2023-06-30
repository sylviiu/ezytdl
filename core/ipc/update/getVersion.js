const getPath = require('../../../util/getPath');

module.exports = {
    type: `handle`,
    func: (_e, name) => {
        if(require('fs').existsSync(getPath(`./util/currentVersion/${name}.js`, true))) {
            return require(`../../../util/currentVersion/${name}`)(false, true)
        } else return null;
    }
}