const electron = require('electron');

let ready = electron.app.isReady()

module.exports = async (type, ...content) => {
    if(!ready) {
        console.log(`createdialog called but app not ready!`)
        await new Promise(r => {
            electron.app.whenReady().then(r)
        });
    };

    console.log(`createDialog`, type, ...content)

    if(type == `error`) {
        electron.dialog.showErrorBox(...content)
        //electron.ipcRenderer.invoke("showDialog", "msg")
    }
}