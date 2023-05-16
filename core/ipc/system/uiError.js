module.exports = {
    type: `on`,
    func: (_e, err) => require(`../../../util/errorHandler`)(err)
}