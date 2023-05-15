const { app, Menu, Tray, nativeImage } = require('electron');

const { queue, queueEventEmitter, queueAction } = require(`../util/downloadManager`);

global.tray = null;

const path = require('path')

let s = `/`;
if(process.platform == `win32`) s = `\\`;

const electronPath = require('electron').app.getAppPath();

module.exports = () => {
    const icon = (electronPath.includes(`app.asar`) ? `${electronPath.replace(`app.asar`, `app.asar.unpacked`)}/` : `./`) + (`res/packageIcons/icon-64x64.png`);

    global.tray = new Tray(icon);

    const createArrayAndApply = (queue) => {
        const length = Object.values(queue).slice(1).reduce((a,b) => a+b.length, 0);

        const a = [];

        const str = [];

        if(queue.active.length > 0) str.push(`${queue.active.length} downloading`);
        if(queue.paused.length > 0) str.push(`${queue.active.length} paused`);
        if(queue.queue.length > 0) str.push(`${queue.queue.length} in queue`);

        a.push({
            //icon: icon,
            label: `ezytdl v${require(`../package.json`).version}`,
            enabled: false
        });

        a.push({
            label: `${queue.active.length} downloading`,
            enabled: false
        });

        a.push({
            label: `Check for updates`,
            click: () => require(`./checkForUpdates`)(true)
        })

        a.push({ type: `separator` })

        a.push({
            label: `Clear Queue (${queue.queue.length})`,
            click: () => queueAction(queue.queue.map(o => o.id), `remove`),
            enabled: queue.queue.length > 0
        });

        a.push({
            label: `Clear Completed (${queue.complete.length})`,
            click: () => queueAction(queue.complete.map(o => o.id), `remove`),
            enabled: queue.complete.length > 0
        });

        a.push({ type: `separator` }, {
            label: `Quit`,
            click: () => require(`./quit`)()
        })

        const contextMenu = Menu.buildFromTemplate(a);

        global.tray.setContextMenu(contextMenu);

        global.tray.setToolTip(`${length} in queue`);
    }

    queueEventEmitter.on(`queueUpdate`, createArrayAndApply);

    createArrayAndApply(queue);

    global.tray.on(`click`, require(`./bringToFront`));
}