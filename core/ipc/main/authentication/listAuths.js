module.exports = {
    type: `handle`,
    func: () => require(`../../../authentication`).list()
}