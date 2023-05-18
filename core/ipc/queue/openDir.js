const { shell } = require('electron');

module.exports = {
    type: `on`,
    func: (_e, id) => {
        const { getFromQueue } = require(`../../../util/downloadManager`);

        if(!id) {
            const { saveLocation } = require(`../../../getConfig`)();
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