const electron = require('electron');

module.exports = (type, ...content) => {
    if(type == `error`) {
        electron.dialog.showErrorBox(...content)
        //electron.ipcRenderer.invoke("showDialog", "msg")
    }
}