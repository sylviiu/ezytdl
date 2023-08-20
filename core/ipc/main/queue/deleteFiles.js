module.exports = {
    type: `on`,
    func: (_e, id) => {
        const { getFromQueue } = require(`../../../../util/downloadManager`).default;

        if(id) {
            const a = getFromQueue(id);
    
            console.log(id, a)
    
            if(a && typeof a.deleteFiles == `function`) {
                a.deleteFiles();
                require(`../../../../util/downloadManager`).default.queueAction(id, `remove`);
                return true;
            } else {
                return false;
            }
        }
    }
}