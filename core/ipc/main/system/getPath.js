module.exports = {
    type: `handle`,
    func: (_e, [path, allowNull]) => new Promise((res, rej) => require(`../../../../util/getPath`)(path, allowNull, false, true).then(res).catch(rej))
}