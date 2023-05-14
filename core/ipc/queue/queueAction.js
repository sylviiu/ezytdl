const { queueAction } = require(`../../../util/downloadManager`);

module.exports = {
    type: `on`,
    func: (event, args) => {
        console.log(`Action`, args);
        const proc = require(`../../../util/downloadManager`).queueAction(args.id, args.action);
    }
}