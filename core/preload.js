const { contextBridge, ipcRenderer } = require('electron');

const addScript = (path) => new Promise(res => {
    const script = document.createElement(`script`);

    script.setAttribute(`src`, path);
    script.setAttribute(`async`, false);

    document.head.appendChild(script);

    script.addEventListener(`load`, () => {
        console.log(`loaded script ${path}`)
        res()
    });
})

console.log(`preload :D`);

let updateAvailable = false;

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

on(`updateAvailable`, () => updateAvailable = true)

contextBridge.exposeInMainWorld(`windowControls`, {
    close: () => send(`windowClose`),
    maximize: () => send(`windowMaximize`),
    minimize: () => send(`windowMinimize`),
    enabled: () => invoke(`windowControlsEnabled`)
})

contextBridge.exposeInMainWorld(`system`, {
    loading: () => invoke(`loading`),
    addScript
})

contextBridge.exposeInMainWorld(`dialog`, {
    get: (id) => invoke(`getDialog`, id),
    send: (id, btnID) => invoke(`dialogButton`, {id, btnID}),
    setHeight: (id, height) => invoke(`setDialogHeight`, {id, height})
})

contextBridge.exposeInMainWorld(`version`, {
    get: () => invoke(`version`),
    checkForUpdates: () => invoke(`checkForUpdates`),
    onUpdate: (cb) => on(`updateAvailable`, cb),
    openUpdatePage: () => send(`openUpdatePage`)
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
    search: (query) => invoke(`search`, query),
    download: (obj) => send(`download`, obj),
    action: (obj) => send(`queueAction`, obj),
    openDir: (id) => send(`openDir`, id),
    deleteFiles: (id) => send(`deleteFiles`, id),
    refreshUpdates: () => send(`refreshDownloadStatuses`),
    formatStatusUpdate: (callback) => on(`formatStatusUpdate`, (_e, obj) => callback(obj)),
    formatStatusPercent: (callback) => on(`formatStatusPercent`, (_e, obj) => callback(obj)),
    queueUpdate: (callback) => on(`queueUpdate`, (_e, obj) => callback(obj)),
    queueProgress: (callback) => on(`queueProgress`, (_e, num) => callback(num)),
});

contextBridge.exposeInMainWorld(`changelog`, {
    check: () => send(`checkChangelog`),
    get: () => invoke(`getChangelog`),
});

window.onerror = (msg, url, line, col, error) => send(`uiError`, { msg, url, line, col, error });

const name = window.location.pathname.split(`/`).slice(-1)[0].split(`.`).slice(0, -1).join(`.`);

contextBridge.exposeInMainWorld(`preload`, {
    oncomplete: (cb) => script.addEventListener(`load`, cb)
});

const util = [`popout.js`, `progressBar.js`, `progressCircle.js`, `removeCardAnim.js`, `removeElements.js`];
const topjs = [`feelLikeNativeApp.js`, `vars.js`];
const afterload = [`downloadManager.js`];

addEventListener(`DOMContentLoaded`, async () => {
    console.log(`-- ADDING UTIL`)

    for(const script of util) await addScript(`./util/${script}`);

    console.log(`-- ADDING TOPJS`)

    for(const script of topjs) await addScript(`./topjs/${script}`);

    console.log(`-- ADDING PAGESCRIPT`)

    await addScript(`./pagescripts/${name.includes(`-`) ? name.split(`-`)[0] : name}.js`);

    console.log(`-- ADDING AFTERLOAD`)

    for(const script of afterload) await addScript(`./afterload/${script}`);

    const enableUpdateButton = () => {
        document.getElementById(`updateAvailable`).classList.add(`d-flex`);
        document.getElementById(`updateAvailable`).classList.remove(`d-none`);
        document.getElementById(`updateAvailable`).onclick = () => send(`openUpdatePage`)
    }

    if(document.getElementById(`updateAvailable`)) {
        console.log(`updateAvailable Enabled`)
        invoke(`checkForUpdates`).then(r => r ? enableUpdateButton() : null);
        if(updateAvailable) enableUpdateButton()
    }
});