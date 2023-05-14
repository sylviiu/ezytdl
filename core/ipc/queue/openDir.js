module.exports = {
    type: `handle`,
    func: (_e, id) => {
        const { queue } = require(`../../../util/downloadManager`);

        let a = queue[id];

        if(a && a.status && a.status.saveLocation) {
            shell.openPath(a.status.saveLocation);
            return true;
        } else {
            return false;
        }
    }
}