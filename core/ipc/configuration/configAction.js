module.exports = {
    type: `handle`,
    func: (_e, {key, config, args}) => require(`../../../core/configActions`)(config)[key].func(...args)
}