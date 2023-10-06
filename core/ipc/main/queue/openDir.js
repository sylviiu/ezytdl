const { shell } = require('electron');
const pfs = require(`../../../../util/promisifiedFS`)
const sendNotification = require(`../../../sendNotification`);

module.exports = {
    type: `handle`,
    func: (_e, id) => new Promise(async res => {
        const { getFromQueue } = require(`../../../../util/downloadManager`).default;

        console.log(`openDir`, id)

        if(!id) {
            console.log(`No ID, opening default save location`)
            const { saveLocation } = await require(`../../../../getConfig`)();
            shell.showItemInFolder(saveLocation);
            return res(true);
        } else {
            const a = getFromQueue(id);
    
            console.log(id, a)

            console.log(`openDir for ${id}:`, a.status)
    
            if(a && a.status) {
                console.log(a.status)

                if(a.status.destinationFile && await pfs.existsSync(a.status.destinationFile)) {
                    shell.showItemInFolder(a.status.destinationFile);
                    return res(true);
                } else if(a.status.saveLocation && await pfs.existsSync(a.status.saveLocation)) {
                    sendNotification({
                        headingText: `Unable to find file`,
                        bodyText: `The file you're trying to open doesn't exist. It may have been deleted, moved, or there may be a bug in the code.`,
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