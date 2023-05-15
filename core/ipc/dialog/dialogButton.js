const { get } = require(`../../createDialog`);

module.exports = {
    type: `handle`,
    func: (event, {id, btnID}) => get(id).callback(event, id, btnID)
}