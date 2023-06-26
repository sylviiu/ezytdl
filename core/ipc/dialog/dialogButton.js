const { get } = require(`../../createDialog`);

module.exports = {
    type: `handle`,
    func: (event, {id, btnID, inputs}) => get(id).callback(event, id, btnID, inputs)
}