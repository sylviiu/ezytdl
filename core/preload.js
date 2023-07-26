const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs')

//console.log(`preload :D`);

window.addEventListener("mouseup", (e) => {
    if(e.button === 3 || e.button === 4) e.preventDefault();
});

const invoke = (...args) => {
    //console.log(`ipc invoke`, ...args);
    return ipcRenderer.invoke(...args);
}

const send = (...args) => {
    //console.log(`ipc send`, ...args);
    return ipcRenderer.send(...args);
}

const on = (...args) => {
    //console.log(`ipc on`, ...args);
    return ipcRenderer.on(...args);
}

const getPath = (path, allowNull=true) => {
    //console.log(`getPath: ${path} (allow null: ${allowNull})`)
    return invoke(`getPath`, [path, allowNull])
}

const addScript = (path, type) => new Promise(async (res, rej) => {
    const name = path;

    const script = document.createElement(`script`);

    if(type == `lib`) {
        let usePath = null;
        const checkDir = (p) => {
            if(p) {
                const dir = fs.readdirSync(p);
                if(dir.find(s => s.endsWith(`min.js`))) usePath = require(`path`).join(p, dir.find(s => s.endsWith(`min.js`)))
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

    console.log(`${name} - path: ${path}`)

    if(!path) return null;

    script.setAttribute(`src`, path);
    script.setAttribute(`async`, false);

    document.head.appendChild(script);

    script.addEventListener(`load`, () => {
        //console.log(`loaded script ${path}`)
        res()
    });

    script.addEventListener(`error`, (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        //console.log(`failed to load script ${path}`)
        rej(e)
    });
})

let systemColors = localStorage.getItem(`systemColors`) ? (JSON.parse(localStorage.getItem(`systemColors`)).standard ? JSON.parse(localStorage.getItem(`systemColors`)).standard : JSON.parse(localStorage.getItem(`systemColors`))) : { r: 255, g: 255, b: 255 };

invoke(`systemColors`).then(c => {
    //console.log(`systemColors`, c);
    systemColors = c;
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
            res(tabs.filter(f => f.endsWith(`.js`) && f != `minified.js`));
        })
    }),
    colors: () => systemColors,
    downloadReq: (cb) => on(`download`, cb),
    hasFFmpeg: () => invoke(`hasFFmpeg`),
    hasFFprobe: () => invoke(`hasFFprobe`),
    bridgeNeedsDownload: () => invoke(`bridgeNeedsDownload`),
    pickFile: (opt) => invoke(`pickFile`, opt),
    pickFolder: (opt) => invoke(`pickFolder`, opt),
});

let dialogPromise = new Promise(r => {
    on(`dialog`, (_e, obj) => {
        r(obj);
        //console.log(`dialog`, obj);
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

let preloadedConfig = localStorage.getItem(`systemConfig`) ? JSON.parse(localStorage.getItem(`systemConfig`)) : null;

const configHooks = [
    (conf) => {
        localStorage.setItem(`systemConfig`, JSON.stringify(conf));
        preloadedConfig = conf;
    }
];

on(`configHook`, (_e, config) => {
    console.log(`configHook`, config);
    configHooks.forEach(cb => cb(config))
});

if(!preloadedConfig) invoke(`getConfig`).then(conf => {
    localStorage.setItem(`systemConfig`, JSON.stringify(conf));
    preloadedConfig = conf;
})

const exposedConfiguration = {
    action: (name) => invoke(`configAction`, name),
    actionUpdate: (key, cb) => on(`configActionUpdate-${key}`, cb),
    get: (name) => new Promise(async res => {
        if(!name && preloadedConfig) {
            res(preloadedConfig)
            preloadedConfig = null;
        } else invoke(`getConfig`, name).then(data => {
            res(data);
        })
    }),
    set: (name, newObj) => invoke(`setConfig`, [name, newObj]),
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
    ffprobe: (path) => invoke(`ffprobe`, path),
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

const scriptsObj = {
    libs: () => new Promise(async res => {
        addScript(`./lib.js`).then(res).catch(async e => {
            const lib = Object.values(require(`../build/scripts/addLibs`).scripts);
            console.log(`-- ADDING lib: ${lib.join(`, `)}`);
            Promise.all(lib.map(name => addScript(`../${name}`))).then(res);
        })
    }),
    util: () => new Promise(async res => {
        addScript(`./util/minified.js`).then(res).catch(async e => {
            fs.readdir(await getPath(`./html/util`), (e, util) => {
                if(e) throw e;
                util = util.filter(s => s.endsWith(`.js`) && s != `minified.js`)
                //console.log(`-- ADDING util: ${util.join(`, `)}`)
                Promise.all(util.map(path => addScript(`./util/${path}`))).then(res)
            });
        });
    }),
    topjs: () => new Promise(async res => {
        addScript(`./topjs/minified.js`).then(res).catch(async e => {
            fs.readdir(await getPath(`./html/topjs`), (e, topjs) => {
                if(e) throw e;
                topjs = topjs.filter(s => s.endsWith(`.js`) && s != `minified.js`)
                //console.log(`-- ADDING topjs: ${topjs.join(`, `)}`)
                Promise.all(topjs.map(path => addScript(`./topjs/${path}`))).then(res)
            });
        });
    }),
    pagescript: (useName=name) => {
        //console.log(`-- ADDING pagescript`)
        return addScript(`./pagescripts/${useName.includes(`-`) ? useName.split(`-`)[0] : useName}.js`);
    },
    afterload: () => new Promise(async res => {
        addScript(`./afterload/minified.js`).then(res).catch(async e => {
            fs.readdir(await getPath(`./html/afterload`), (e, afterload) => {
                if(e) throw e;
                afterload = afterload.filter(s => s.endsWith(`.js`) && s != `minified.js`)
                //console.log(`-- ADDING afterload: ${afterload.join(`, `)}`)
                Promise.all(afterload.map(path => addScript(`./afterload/${path}`))).then(res)
            });
        });
    }),
}

contextBridge.exposeInMainWorld(`scripts`, scriptsObj);

addEventListener(`DOMContentLoaded`, async () => {
    await scriptsObj.libs();
    await scriptsObj.util();
    await scriptsObj.topjs();
    await scriptsObj.pagescript();

    //console.log(`name: ${name}`)

    if(!name.includes(`introAnimation`)) await scriptsObj.afterload();

    //console.log(`Scripts added!`);
});