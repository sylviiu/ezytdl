module.exports = {
    type: `handle`,
    func: (_e, {key, config, args}) => require(`../../../configActions`)(config)[key].func(...args)
}