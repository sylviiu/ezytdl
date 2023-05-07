module.exports = {
    type: 'get',
    path: '/version',
    func: (req, res) => res.send(require(`../package.json`).version)
}