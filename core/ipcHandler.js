const { ipcMain } = require('electron');

const fs = require('fs'), path = require('path')

const ipcMethodGroups = fs.readdirSync(path.join(__dirname, `ipc`));

global.windowOpened = false;

ipcMain.on(`opened`, () => global.windowOpened = true);

const registerIpc = (group, method) => {
    const name = method.split(`.`).slice(0, -1).join(`.`);

    const ipcEvent = require(`./ipc/${group}/${method}`);

    if(!ipcEvent.type) return console.log(group, method, ipcEvent)

    console.log(`adding event ${name} (type ${ipcEvent.type}) from ${method}`);

    if(ipcMain && ipcMain[ipcEvent.type] == undefined) throw new Error(`Invalid ipc type ${ipcEvent.type}`);

    ipcMain.removeHandler(name);

    ipcMain[ipcEvent.type](name, (event, args) => {
        console.log(`${ipcEvent.type.toUpperCase()} / ${name} (${args ? typeof args.length == `number` ? args.length : 1 : 0} args)`);
        return ipcEvent.func(event, args);
    })
}

module.exports = () => {
    for (const group of ipcMethodGroups) {
        console.log(`reading ${group} ...`);

        let ipcMethods = fs.readdirSync(path.join(__dirname, `ipc`, group)).filter(f => f.endsWith(`.js`));

        for(const method of ipcMethods) try {
            registerIpc(group, method)
        } catch(e) {
            console.error(`Error in ipc method ${method}: ${e}`)
        };

        global.ipcRegistered = true;
    }
}