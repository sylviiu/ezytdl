module.exports = async () => {
    const { ipcRenderer } = require('electron');
    const fs = require('fs');
    const path = require('path');

    const registerIpc = (group, method) => {
        const name = method.split(`.`).slice(0, -1).join(`.`);

        const ipcEvent = require(`./renderer/${group}/${method}`);

        if(!ipcEvent.type) return console.log(group, method, ipcEvent)

        console.log(`adding event ${name} (type ${ipcEvent.type}) from ${method}`);

        if(ipcRenderer && ipcRenderer[ipcEvent.type] == undefined) throw new Error(`Invalid ipc type ${ipcEvent.type}`);

        ipcRenderer.removeAllListeners(name);

        ipcRenderer[ipcEvent.type](name, (event, args) => {
            console.log(`[IPC IN] ${ipcEvent.type.toUpperCase()} / ${name} (${args ? typeof args.length == `number` ? args.length : 1 : 0} args)`);
            
            return ipcEvent.func(event, args);
        })
    }

    fs.readdir(path.join(__dirname, `renderer`), async (err, files) => {
        if(err) throw err;

        const ipcMethodGroups = [];

        for(const file of files) await new Promise(res => {
            fs.stat(path.join(__dirname, `renderer`, file), (err, stats) => {
                if(err) throw err;

                if(stats.isDirectory()) ipcMethodGroups.push(file);

                res();
            })
        })

        for(const group of ipcMethodGroups) await new Promise(res => {
            console.log(`reading ${group} ...`);

            fs.readdir(path.join(__dirname, `renderer`, group), async (err, files) => {
                let ipcMethods = files.filter(f => f.endsWith(`.js`));

                for(const method of ipcMethods) try {
                    registerIpc(group, method)
                } catch(e) {
                    console.error(`Error in ipc method ${method}: ${e}\n\n${e.stack}`)
                };

                res();
            });
        })
    });
}