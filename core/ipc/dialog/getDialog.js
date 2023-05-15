const { get } = require(`../../createDialog`);

module.exports = {
    type: `handle`,
    func: (event, id) => {
        console.log(`getting dialog ${id}`);
        const dialog = get(id);
        console.log(dialog)
        return JSON.parse(JSON.stringify(dialog));
    }
}