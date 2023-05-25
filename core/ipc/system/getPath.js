module.exports = {
    type: `handle`,
    func: (_e, d) => new Promise(res => res(require(`../../../util/getPath`)(d, true)))
}