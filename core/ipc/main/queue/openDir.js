const { shell } = require('electron');
const pfs = require(`../../../../util/promisifiedFS`)
const sendNotification = require(`../../sendNotification`);

module.exports = {
    type: `on`,
    func: (_e, id) => new Promise(async res => {
        const { getFromQueue } = require(`../../../../util/downloadManager`).default;

        if(!id) {
            const { saveLocation } = await require(`../../../../getConfig`)();
            shell.showItemInFolder(saveLocation);
            return res(true);
        } else {
            const a = getFromQueue(id);
    
            console.log(id, a)
    
            if(a && a.status) {
                console.log(a.status)

                if(a.status.destinationFile && await pfs.existsSync(a.status.destinationFile)) {
                    shell.showItemInFolder(a.status.destinationFile);
                    return res(true);
                } else if(a.status.saveLocation && await pfs.existsSync(a.status.saveLocation)) {
                    sendNotification({
                        headingText: `Unable to find file`,
                        bodyText: `The file you're trying to open doesn't exist. It may have been deleted, moved, or there may be a bug in the code (which is most likely).`,
                    })
                    shell.showItemInFolder(a.status.saveLocation);
                    return res(true);
                }
                
                return res(false);
            } else {
                return res(false);
            }
        }
    })
}