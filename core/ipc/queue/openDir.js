module.exports = {
    type: `handle`,
    func: (_e, id) => {
        const { getFromQueue } = require(`../../../util/downloadManager`);

        const a = getFromQueue(id);

        if(a && a.status && a.status.saveLocation) {
            shell.openPath(a.status.saveLocation);
            return true;
        } else {
            return false;
        }
    }
}