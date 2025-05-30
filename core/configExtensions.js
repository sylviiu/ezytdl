const pfs = require(`../util/promisifiedFS`);
const getPath = require(`../util/getPath`);

module.exports = {
    verify: {
        theme: (userConfig) => {
            console.log(`verifying theme...`)
            if(userConfig.style.theme != 0 && userConfig.style.theme != 1 && userConfig.style.theme != 2) userConfig.style.theme = 0;
            return userConfig
        },
        font: (userConfig) => new Promise(async res => {
            console.log(`verifying font...`)
            if(global.window && global.window.webContents) {
                if(userConfig.font) {
                    global.window.webContents.send(`fontExists`, userConfig.font);
                    require(`electron`).ipcMain.once(`fontExists-${userConfig.font}`, (event, exists) => {
                        if(!exists) userConfig.font = `Alata`;
                        return res(userConfig);
                    });
                } else {
                    userConfig.font = `Alata`;
                    return res(userConfig);
                }
            } else res(userConfig);
        })
    },
    defaults: {
        nightly: (defaultConfig) => Object.assign(defaultConfig, {
            nightlyUpdates: require(`../package.json`).version.includes(`-dev.`) ? true : false
        }),
        checkForUpdates: (defaultConfig) => new Promise(async res => {
            const path = await getPath(`./util/updateAvailable`, true, false, true)
            const checks = (await pfs.readdirSync(path)).filter(f => f.endsWith(`.js`)).map(s => s.split(`.`).slice(0, -1).join(`.`));
            for(const check of checks) {
                defaultConfig.checkForUpdates[check] = true;
            }

            return res(defaultConfig);
        }),
        gpuArgs: (defaultConfig) => new Promise(async res => {
            const gpuArgs = await require(`../util/configs`).ffmpegGPUArgs(null, { waitForPromise: false });
            for(const key of Object.keys(gpuArgs)) {
                if(gpuArgs[key].platform.includes(process.platform)) {
                    defaultConfig.hardwareAcceleratedConversion[key] = false;
                }
            };

            const removedArgs = Object.keys(defaultConfig.hardwareAcceleratedConversion).filter(key => !gpuArgs[key]);
            for(const key of removedArgs) delete defaultConfig.hardwareAcceleratedConversion[key];

            return res(defaultConfig);
        }),
        ffmpegPresets: (defaultConfig) => new Promise(async res => {
            const ffmpegPresets = Object.values(await require(`../util/configs`).ffmpegPresets(null, { waitForPromise: false }));
            for(const {key, defaultEnabled} of ffmpegPresets) {
                defaultConfig.ffmpegPresets[key] = defaultEnabled || false;
            };

            const removedPresets = Object.keys(defaultConfig.ffmpegPresets).filter(key => !ffmpegPresets.map(preset => preset.key).includes(key));
            for(const key of removedPresets) delete defaultConfig.ffmpegPresets[key];

            return res(defaultConfig);
        }),
    },
    post: {
        checkForUpdatesDescription: (userConfig) => new Promise(async res => {
            //console.log(`userConfig`, userConfig, `lastUpdateCheck`, userConfig.lastUpdateCheck)

            if(userConfig.lastUpdateCheck) {
                const time = require(`../util/time`)(Date.now() - userConfig.lastUpdateCheck);
                userConfig.descriptions.checkForUpdates = userConfig.descriptions.checkForUpdates.split(`\n`)[0] + `\n\nLast checked: ${time.string} ago.`;
            }

            return res(userConfig);
        }),
        gpuArgs: (userConfig) => new Promise(async res => {
            const gpuArgs = await require(`../util/configs`).ffmpegGPUArgs(null, { waitForPromise: false });
    
            Object.assign(userConfig.strings, { hardwareAcceleratedConversionExtended: {}, });
            Object.assign(userConfig.descriptions, { hardwareAcceleratedConversionExtended: {}, });
    
            for(const key of Object.keys(gpuArgs)) {
                if(gpuArgs[key].platform.includes(process.platform)) {
                    userConfig.strings.hardwareAcceleratedConversionExtended[key] = gpuArgs[key].name;
                    userConfig.descriptions.hardwareAcceleratedConversionExtended[key] = gpuArgs[key].description;
                }
            };
    
            return res(userConfig);
        }),
        checkForUpdates: (userConfig) => new Promise(async res => {
            const path = await getPath(`./util/updateAvailable`, true, false, true)
            const checks = (await pfs.readdirSync(path)).filter(f => f.endsWith(`.js`)).map(s => s.split(`.`).slice(0, -1).join(`.`));

            Object.assign(userConfig.strings, { checkForUpdatesExtended: {}, });
            Object.assign(userConfig.descriptions, { checkForUpdatesExtended: {}, });

            for(const s of checks) {
                const { name, description } = require(`../util/updateAvailable/${s}`)
                userConfig.strings.checkForUpdatesExtended[s] = name;
                userConfig.descriptions.checkForUpdatesExtended[s] = description;
            }

            return res(userConfig);
        }),
        ffmpegPresets: (userConfig) => new Promise(async res => {
            const ffmpegPresets = Object.values(await require(`../util/configs`).ffmpegPresets(null, { waitForPromise: false }));
    
            Object.assign(userConfig.strings, { ffmpegPresetsExtended: {}, });
            Object.assign(userConfig.descriptions, { ffmpegPresetsExtended: {}, });
    
            for(const {key, name, description} of ffmpegPresets) {
                userConfig.strings.ffmpegPresetsExtended[key] = name || `Unnamed preset.`;
                userConfig.descriptions.ffmpegPresetsExtended[key] = description || `No description provided.`;
            };
    
            return res(userConfig);
        }),
        yeah: (userConfig) => {
            const d = new Date();

            if(d.getMonth() == 4 && d.getDate() == 1) {
                userConfig.font = `Comic Sans MS`;
            };

            return userConfig;
        },
        actions: (userConfig) => new Promise(async res => {
            userConfig.actions = {};
    
            const parseAction = (key, obj, actionsObj) => {
                if(obj.func) {
                    actionsObj[key] = {
                        name: obj.name || `ooh fancy button :D`,
                        args: obj.args || [],
                        manuallySavable: typeof obj.manuallySavable == `boolean` ? obj.manuallySavable : true,
                        confirmation: obj.confirmation || null,
                    };
                } else {
                    if(key) {
                        actionsObj[key + `Extended`] = {}
                        for(const entry of Object.entries(obj)) parseAction(entry[0], entry[1], actionsObj[key + `Extended`]);
                    } else {
                        for(const entry of Object.entries(obj)) parseAction(entry[0], entry[1], actionsObj);
                    }
                }
            };
    
            parseAction(null, require(`../core/configActions.js`)(userConfig), userConfig.actions);

            return res(userConfig);
        })
    }
}