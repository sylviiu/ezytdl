const { get } = require(`../../createDialog`);

module.exports = {
    type: `handle`,
    func: (event, {id, height}) => {
        const dialog = get(id);
        console.log(height)
        dialog.window.setSize(600, Math.round(height));
    }
}