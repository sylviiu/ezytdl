module.exports = {
    type: `on`,
    func: (_e, id) => {
        const { getFromQueue } = require(`../../../util/downloadManager`);

        if(id) {
            const a = getFromQueue(id);
    
            console.log(id, a)
    
            if(a && typeof a.deleteFiles == `function`) {
                a.deleteFiles();
                require(`../../../util/downloadManager`).queueAction(id, `remove`);
                return true;
            } else {
                return false;
            }
        }
    }
}