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

let systemColors = { r: 255, g: 255, b: 255 };

invoke(`systemColors`).then(c => { systemColors = c; })

on(`updateAvailable`, () => updateAvailable = true)

contextBridge.exposeInMainWorld(`windowControls`, {
    close: () => send(`windowClose`),
    maximize: () => send(`windowMaximize`),
    minimize: () => send(`windowMinimize`),
    enabled: () => invoke(`windowControlsEnabled`)
})

contextBridge.exposeInMainWorld(`system`, {
    loading: () => invoke(`loading`),
    addScript,
    colors: () => systemColors
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

const configHooks = [];

contextBridge.exposeInMainWorld(`configuration`, {
    get: () => new Promise(async res => {
        invoke(`getConfig`).then(data => {
            configHooks.forEach(cb => cb(data));
            res(data);
        })
    }),
    set: (newObj) => new Promise(async res => {
        invoke(`setConfig`, newObj).then(data => {
            configHooks.forEach(cb => cb(data));
            res(data);
        })
    }),
    hook: (cb) => configHooks.push(cb)
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

const assets = require(`./build-assets.json`);

addEventListener(`DOMContentLoaded`, async () => {
    console.log(assets)

    console.log(`-- ADDING UTIL`);
    await Promise.all(assets.util.map(path => addScript(`./util/${path}`)));

    console.log(`-- ADDING TOPJS`);
    await Promise.all(assets.topjs.map(path => addScript(`./topjs/${path}`)));

    console.log(`-- ADDING PAGESCRIPT`)
    await addScript(`./pagescripts/${name.includes(`-`) ? name.split(`-`)[0] : name}.js`);

    console.log(`-- ADDING AFTERLOAD`)
    await Promise.all(assets.afterload.map(path => addScript(`./afterload/${path}`)));

    console.log(`Scripts added!`);

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