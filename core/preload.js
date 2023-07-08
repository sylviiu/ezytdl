const { contextBridge, ipcRenderer, webFrame } = require('electron');
const fs = require('fs')

console.log(`preload :D`);

let updateAvailable = false;

window.addEventListener("mouseup", (e) => {
    if(e.button === 3 || e.button === 4) e.preventDefault();
});

// electron does not allow you to require modules in the preload script, and it is not a planned change -- you can do this by disabling the sandbox, which is a shit idea.
// i wish you can make the preload an array of scripts but NoOoO

const invoke = (...args) => {
    console.log(`ipc invoke`, ...args);
    return ipcRenderer.invoke(...args);
}

const send = (...args) => {
    console.log(`ipc send`, ...args);
    return ipcRenderer.send(...args);
}

const on = (...args) => {
    console.log(`ipc on`, ...args);
    return ipcRenderer.on(...args);
}

const getPath = (...data) => invoke(`getPath`, ...data)

const addScript = (path, type) => new Promise(async res => {
    const script = document.createElement(`script`);

    if(type == `lib`) {
        let usePath = null;
        const checkDir = (p) => {
            if(p) {
                const dir = fs.readdirSync(p);
                if(dir.find(s => s.endsWith(`.min.js`))) {
                    usePath = require(`path`).join(p, dir.find(s => s.endsWith(`.min.js`)))
                }
            }
        };

        const checkDirs = [`lib`, `src`, `dist`]

        for (const dir of checkDirs) {
            const thisPath = await getPath(`node_modules/${path}/${dir}`);
            checkDir(thisPath);
            if(usePath) break;
        }

        path = usePath;
    }

    console.log(`path: ${path}`)

    if(!path) return null;

    script.setAttribute(`src`, path);
    script.setAttribute(`async`, false);

    document.head.appendChild(script);

    script.addEventListener(`load`, () => {
        console.log(`loaded script ${path}`)
        res()
    });
})

const parseSystemColors = require(`../util/parseSystemColors`);

let systemColors = localStorage.getItem(`systemColors`) ? JSON.parse(localStorage.getItem(`systemColors`)) : parseSystemColors({ r: 255, g: 255, b: 255 });

invoke(`systemColors`).then(c => { 
    console.log(`systemColors`, c);
    systemColors = parseSystemColors(c);
    localStorage.setItem(`systemColors`, JSON.stringify(systemColors));
})

on(`updateAvailable`, () => updateAvailable = true)

contextBridge.exposeInMainWorld(`windowControls`, {
    close: () => send(`windowClose`),
    maximize: () => send(`windowMaximize`),
    minimize: () => send(`windowMinimize`),
    enabled: () => invoke(`windowControlsEnabled`)
})

contextBridge.exposeInMainWorld(`authentication`, {
    check: (...arg) => invoke(`checkAuth`, arg),
    getKey: (...arg) => invoke(`getAuthKey`, arg),
    getToken: (...arg) => invoke(`getAuthToken`, arg),
    remove: (...arg) => invoke(`removeAuth`, arg),
    list: () => invoke(`listAuths`),
});

contextBridge.exposeInMainWorld(`system`, {
    loading: () => invoke(`loading`),
    detailsStr: () => invoke(`detailsStr`),
    addScript,
    getPath,
    getTabFiles: () => new Promise(async (res, rej) => {
        fs.readdir(await getPath(`./html/tabs/`), async (e, tabs) => {
            if(e) return rej(e);
            res(tabs);
        })
    }),
    colors: () => systemColors,
    downloadReq: (cb) => on(`download`, cb),
    hasFFmpeg: () => invoke(`hasFFmpeg`),
    bridgeNeedsDownload: () => invoke(`bridgeNeedsDownload`),
    pickFile: () => invoke(`pickFile`),
});

let dialogPromise = new Promise(r => {
    on(`dialog`, (_e, obj) => {
        r(obj);
        console.log(`dialog`, obj);
    })
});

contextBridge.exposeInMainWorld(`dialog`, {
    get: () => dialogPromise,
    create: (content) => invoke(`createDialog`, content),
    send: (id, btnID, inputs) => invoke(`dialogButton`, {id, btnID, inputs}),
    setHeight: (id, height) => invoke(`setDialogHeight`, {id, height})
})

contextBridge.exposeInMainWorld(`version`, {
    get: () => invoke(`version`),
    checkForUpdates: () => invoke(`checkForUpdates`),
    onUpdate: (cb) => on(`updateAvailable`, cb),
    onUpdateProgress: (cb) => {
        invoke(`getUpdateStatus`).then(o => {
            cb(o);
            on(`updateProgress`, (_e2, o2) => cb(o2));
        })
    },
    openUpdatePage: () => send(`openUpdatePage`)
});

const configHooks = [];

const exposedConfiguration = {
    action: (name) => invoke(`configAction`, name),
    actionUpdate: (key, cb) => on(`configActionUpdate-${key}`, cb),
    get: (name) => new Promise(async res => {
        invoke(`getConfig`, name).then(data => {
            if(!name) configHooks.forEach(cb => cb(data));
            res(data);
        })
    }),
    set: (name, newObj) => new Promise(async res => {
        invoke(`setConfig`, [name, newObj]).then(data => {
            if(!name) {
                configHooks.forEach(cb => cb(data));
                res(data);
            } else exposedConfiguration.get().then(() => res(data));
        })
    }),
    hook: (cb) => configHooks.push(cb)
}

contextBridge.exposeInMainWorld(`configuration`, exposedConfiguration);

contextBridge.exposeInMainWorld(`notifications`, {
    handler: (callback) => on(`notification`, (_e, content) => callback(content)),
    setReady: () => send(`opened`)
});

contextBridge.exposeInMainWorld(`update`, {
    download: (client) => send(`updateClient`, client),
    event: (callback) => on(`updateClientEvent`, (_e, content) => callback(content)),
    getVersion: (name) => invoke(`getVersion`, name),
})

contextBridge.exposeInMainWorld(`mainQueue`, {
    get: () => invoke(`getQueue`),
    ffprobeInfo: (path) => invoke(`ffprobeInfo`, path),
    getInfo: (url) => invoke(`getInfo`, url),
    parseInfo: (info) => invoke(`parseInfo`, info),
    parseOutputTemplate: (...arg) => invoke(`parseOutputTemplate`, arg),
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

contextBridge.exposeInMainWorld(`util`, {
    time: require(`../util/time`),
})

window.onerror = (msg, url, line, col, error) => send(`uiError`, { msg, url, line, col, error });

const name = window.location.pathname.split(`/`).slice(-1)[0].split(`.`).slice(0, -1).join(`.`);

contextBridge.exposeInMainWorld(`preload`, {
    oncomplete: (cb) => script.addEventListener(`load`, cb)
});

const libs = [`animejs`, `showdown`, `color-scheme`]

const scriptsObj = {
    libs: () => {
        console.log(`-- ADDING libs`)
        return Promise.all(libs.map(name => addScript(`${name}`, `lib`)));
    },
    util: () => new Promise(async res => {
        fs.readdir(await getPath(`./html/util`), (e, util) => {
            if(e) throw e;
            console.log(`-- ADDING util: ${util.join(`, `)}`)
            Promise.all(util.map(path => addScript(`./util/${path}`))).then(res)
        });
    }),
    topjs: () => new Promise(async res => {
        fs.readdir(await getPath(`./html/topjs`), (e, topjs) => {
            if(e) throw e;
            console.log(`-- ADDING topjs: ${topjs.join(`, `)}`)
            Promise.all(topjs.map(path => addScript(`./topjs/${path}`))).then(res)
        });
    }),
    pagescript: (useName=name) => {
        console.log(`-- ADDING pagescript`)
        return addScript(`./pagescripts/${useName.includes(`-`) ? useName.split(`-`)[0] : useName}.js`);
    },
    afterload: () => new Promise(async res => {
        fs.readdir(await getPath(`./html/afterload`), (e, afterload) => {
            if(e) throw e;
            console.log(`-- ADDING afterload: ${afterload.join(`, `)}`)
            Promise.all(afterload.map(path => addScript(`./afterload/${path}`))).then(res)
        });
    }),
}

contextBridge.exposeInMainWorld(`scripts`, scriptsObj);

addEventListener(`DOMContentLoaded`, async () => {
    await scriptsObj.libs();
    await scriptsObj.util();
    await scriptsObj.topjs();
    await scriptsObj.pagescript();

    console.log(`name: ${name}`)

    if(!name.includes(`introAnimation`)) await scriptsObj.afterload();

    console.log(`Scripts added!`);

    const enableUpdateButton = () => {
        document.getElementById(`updateAvailable`).classList.add(`d-flex`);
        document.getElementById(`updateAvailable`).classList.remove(`d-none`);
        document.getElementById(`updateAvailable`).onclick = () => send(`openUpdatePage`)
    }

    if(document.getElementById(`updateAvailable`)) {
        console.log(`updateAvailable Enabled`)
        if(updateAvailable) enableUpdateButton()
    }
});