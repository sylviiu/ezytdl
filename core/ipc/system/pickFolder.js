const { dialog } = require(`electron`);

module.exports = {
    type: `handle`,
    func: (_e, opt={}) => new Promise(async res => {
        dialog.showOpenDialog(global.window, Object.assign({
            properties: [`openDirectory`]
        }, opt)).then(result => {
            if(result && result.filePaths[0]) {
                res(result.filePaths[0])
            } else {
                res(null)
            }
        }).catch(e => {
            res(null);
        })
    })
}