const { queueAction } = require(`../../../../util/downloadManager`).default;

module.exports = {
    type: `on`,
    func: (event, args) => {
        console.log(`Action`, args);
        const proc = require(`../../../../util/downloadManager`).default.queueAction(args.id, args.action);
    }
}