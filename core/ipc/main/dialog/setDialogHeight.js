const { get } = require(`../../../createDialog`);

module.exports = {
    type: `handle`,
    func: (event, {id, o}) => {
        const dialog = get(id);
        console.log(o)
        dialog.window.setSize(Math.round(o.width || 600), Math.round(o.height));
    }
}