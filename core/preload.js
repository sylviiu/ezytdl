const { contextBridge, ipcRenderer } = require('electron');

console.log(`preload :D`);

window.addEventListener("mouseup", (e) => {
    if(e.button === 3 || e.button === 4) e.preventDefault();
});

// electron does not allow you to require modules in the preload script, and it is not a planned change -- you can do this by disabling the sandbox, which is a shit idea.
// i wish you can make the preload an array of scripts but NoOoO

const invoke = (...args) => {
    console.log(`invoke`, ...args);
    return ipcRenderer.invoke(...args);
}

const send = (...args) => {
    console.log(`send`, ...args);
    return ipcRenderer.send(...args);
}

const on = (...args) => {
    console.log(`on`, ...args);
    return ipcRenderer.on(...args);
}

contextBridge.exposeInMainWorld(`windowControls`, {
    close: () => send(`windowClose`),
    maximize: () => send(`windowMaximize`),
    minimize: () => send(`windowMinimize`),
    enabled: () => invoke(`windowControlsEnabled`)
})

contextBridge.exposeInMainWorld(`system`, {
    loading: () => invoke(`loading`)
})

contextBridge.exposeInMainWorld(`dialog`, {
    get: (id) => invoke(`getDialog`, id),
    send: (id, btnID) => invoke(`dialogButton`, {id, btnID}),
    setHeight: (id, height) => invoke(`setDialogHeight`, {id, height})
})

contextBridge.exposeInMainWorld(`version`, {
    get: () => invoke(`version`),
    checkForUpdates: () => invoke(`checkForUpdates`),
    openUpdatePage: () => send(`openUpdatePage`),
});

contextBridge.exposeInMainWorld(`configuration`, {
    get: () => invoke(`getConfig`),
    set: (newObj) => invoke(`setConfig`, newObj),
});

contextBridge.exposeInMainWorld(`notifications`, {
    handler: (callback) => on(`notification`, (_e, content) => callback(content)),
    setReady: () => send(`opened`)
});

contextBridge.exposeInMainWorld(`update`, {
    download: (client) => send(`updateClient`, client),
    event: (callback) => on(`updateClientEvent`, (_e, content) => callback(content))
})

contextBridge.exposeInMainWorld(`mainQueue`, {
    get: () => invoke(`getQueue`),
    getInfo: (url) => invoke(`getInfo`, url),
    download: (obj) => send(`download`, obj),
    action: (obj) => send(`queueAction`, obj),
    openDir: (id) => send(`openDir`, id),
    refreshUpdates: () => send(`refreshDownloadStatuses`),
    formatStatusUpdate: (callback) => on(`formatStatusUpdate`, (_e, obj) => callback(obj)),
    queueUpdate: (callback) => on(`queueUpdate`, (_e, obj) => callback(obj)),
});

contextBridge.exposeInMainWorld(`changelog`, {
    check: () => send(`checkChangelog`),
    get: () => invoke(`getChangelog`),
});

window.onerror = (msg, url, line, col, error) => send(`uiError`, { msg, url, line, col, error });

const name = window.location.pathname.split(`/`).slice(-1)[0].split(`.`).slice(0, -1).join(`.`);

const script = document.createElement(`script`);
script.setAttribute(`src`, `./pagescripts/${name.includes(`-`) ? name.split(`-`)[0] : name}.js`);
script.setAttribute(`async`, false);

script.addEventListener(`load`, () => {
    console.log(`loaded script!`)
});

contextBridge.exposeInMainWorld(`preload`, {
    oncomplete: (cb) => script.addEventListener(`load`, cb)
});

addEventListener(`DOMContentLoaded`, () => {
    document.body.insertBefore(script, document.body.firstElementChild);
});