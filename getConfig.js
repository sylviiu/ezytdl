const errorHandler = require("./util/errorHandler.js");

const fs = require('fs');
const os = require('os');

const sendNotification = require("./core/sendNotification.js");

let newSettingsNotifSent = false;

let firstCheckDone = false;

module.exports = (configObject) => {
    try {
        const defaultConfig = Object.assign({}, require(`./defaultConfig.json`));

        const gpuArgs = require(`./util/ffmpegGPUArgs.json`);

        // add ffmpeg hardware acceleration options to config
        for(const key of Object.keys(gpuArgs)) {
            if(gpuArgs[key].platform.includes(process.platform)) {
                defaultConfig.hardwareAcceleratedConversion[key] = false;
            }
        }
    
        fs.mkdirSync(global.configPath, { recursive: true, failIfExists: false });
        
        let checked = false;

        if(!fs.existsSync(`${global.configPath}/config.json`)) {
            fs.writeFileSync(`${global.configPath}/config.json`, JSON.stringify(defaultConfig, null, 4), { encoding: `utf-8` });
            checked = true;
        } else {
            try {
                JSON.parse(fs.readFileSync(`${global.configPath}/config.json`));
            } catch(e) {
                fs.unlinkSync(`${global.configPath}/config.json`);
                module.exports(configObject);
            }
        };

        const checkKeys = (logPrefix, thisKey, config, defaults, addDefaults, removeNonexistent) => {
            if(removeNonexistent) {
                for(const key of Object.keys(config)) {
                    if(typeof defaults[key] == 'undefined') {
                        delete config[key];
                        checked = true;
                    }
                }
            }

            for(const key of Object.keys(defaults)) {
                if(addDefaults && typeof config[key] == `undefined`) {
                    if(!newSettingsNotifSent && !firstCheckDone) {
                        newSettingsNotifSent = true;
                        sendNotification({
                            headingText: `New settings!`,
                            bodyText: `New settings have been added to the config! Please check your settings!`
                        });
                    }

                    config[key] = defaults[key];
                    checked = true;
                };

                if(!addDefaults && !config[key]) {

                } else {
                    //console.log(`key`, key, `type`, typeof config[key], `value`, config[key], `default type`, typeof defaults[key], `default value`, defaults[key])
                    
                    if(defaults[key] && typeof defaults[key] == `object`) {
                        //console.log(`checking keys for ${key}`)
                        config[key] = checkKeys(logPrefix + ` > `, thisKey + ` / ` + key, config[key], defaults[key], addDefaults, removeNonexistent);
                    } else {
                        if(config[key] && typeof config[key] != typeof defaults[key]) {
                            if(typeof defaults[key] == `number` && !isNaN(config[key])) config[key] = Number(config[key]);
                            if(typeof defaults[key] == `boolean` && (config[key] == `true` || config[key] == `false`)) config[key] = config[key] == `true` ? true : false;
                            //console.log(`type`, typeof config[key], `value`, config[key])
                        }
        
                        if((!typeof config[key] || typeof config[key] == `undefined`) && !addDefaults) {
        
                        } else if(typeof config[key] != typeof defaults[key]) {
                            sendNotification({
                                type: `warn`,
                                headingText: `Config key mismatch!`,
                                bodyText: `The config key "${key}" is missing or is of the wrong type! (Expected: ${typeof defaults[key]}, got: ${config[key] ? typeof config[key] : ``})`
                            });
                            //console.log(config[key], defaults[key])
                            config[key] = defaults[key];
                            if(addDefaults) checked = true;
                        }
                    }
                }
            };

            return config;
        }
        
        if(!checked) {
            const config = JSON.parse(fs.readFileSync(`${global.configPath}/config.json`));

            const checkedConfig = checkKeys(`> `, `root config object`, config, defaultConfig, true, true);

            //console.log(config, checkedConfig)
            
            if(checked) {
                console.log(`Updated config!`)
                fs.writeFileSync(`${global.configPath}/config.json`, JSON.stringify(checkedConfig, null, 4), { encoding: `utf-8` });
            }
        };
        
        if(configObject) {
            const config = JSON.parse(fs.readFileSync(`${global.configPath}/config.json`));

            const checkedConfig = checkKeys(`> `, `updated config object`, configObject, defaultConfig);
            
            fs.writeFileSync(`${global.configPath}/config.json`, JSON.stringify(Object.assign({}, config, checkedConfig), null, 4), { encoding: `utf-8` });

            if(configObject.alwaysUseLightIcon != undefined) require(`./core/downloadIcon.js`).set();
        };

        const userConfig = JSON.parse(fs.readFileSync(`${global.configPath}/config.json`))

        let slashUsed = require('os').platform() == `win32` ? `\\` : `/`

        if(!userConfig.saveLocation) userConfig.saveLocation = require(`path`).join((fs.existsSync(require(`path`).join(os.homedir(), `Downloads`)) ? require(`path`).join(os.homedir(), `Downloads`) : os.homedir()), `ezytdl`);

        if(userConfig.downloadFromClipboard) {
            global.downloadFromClipboard = true;
        } else {
            global.downloadFromClipboard = false;
        }

        firstCheckDone = true;

        userConfig.strings = Object.assign(require(`./configStrings.json`), {
            hardwareAcceleratedConversionExtended: {}
        });

        // add ffmpeg hardware acceleration options to config strings
        for(const key of Object.keys(gpuArgs)) {
            if(gpuArgs[key].platform.includes(process.platform)) {
                userConfig.strings.hardwareAcceleratedConversionExtended[key] = gpuArgs[key].name;
            }
        }

        userConfig.descriptions = Object.assign(require(`./configDescriptions.json`), {
            hardwareAcceleratedConversionExtended: {}
        });

        // add ffmpeg hardware acceleration options to config descriptions
        for(const key of Object.keys(gpuArgs)) {
            if(gpuArgs[key].platform.includes(process.platform)) {
                userConfig.descriptions.hardwareAcceleratedConversionExtended[key] = gpuArgs[key].description;
            }
        }

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

        parseAction(null, require(`./core/configActions.js`)(userConfig), userConfig.actions);

        return userConfig;
    } catch(e) {
        errorHandler(e)
    }
}