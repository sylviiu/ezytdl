module.exports = {
    name: `libnotify`,
    func: () => new Promise(res => {
        if(require(`../linux-library`)(module.exports.name)) {
            return res({ status: true })
        } else return res({
            status: false,
            missing: module.exports.name
        })
    })
}