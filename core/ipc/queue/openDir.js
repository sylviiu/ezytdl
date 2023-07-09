const { shell } = require('electron');

module.exports = {
    type: `on`,
    func: async (_e, id) => {
        const { getFromQueue } = require(`../../../util/downloadManager`).default;

        if(!id) {
            const { saveLocation } = await require(`../../../getConfig`)();
            shell.openPath(saveLocation);
            return true;
        } else {
            const a = getFromQueue(id);
    
            console.log(id, a)
    
            if(a && a.status && a.status.saveLocation) {
                shell.openPath(a.status.saveLocation);
                return true;
            } else {
                return false;
            }
        }
    }
}