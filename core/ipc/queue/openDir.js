const { shell } = require('electron');

module.exports = {
    type: `on`,
    func: (_e, id) => {
        const { getFromQueue } = require(`../../../util/downloadManager`);

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