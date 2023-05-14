const errorHandler = require("./util/errorHandler.js");

const fs = require('fs');
const os = require('os');

const sendNotification = require("./core/sendNotification.js");

let newSettingsNotifSent = false;

let firstCheckDone = false;

module.exports = (configObject) => {
    try {
        const defaultConfig = require(`./defaultConfig.json`)
    
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

        const checkKeys = (logPrefix, thisKey, config, defaults, addDefaults) => {
            for(const key of Object.keys(defaults)) {
                if(addDefaults && typeof config[key] == `undefined`) {
                    if(!newSettingsNotifSent && !firstCheckDone) {
                        newSettingsNotifSent = true;
                        console
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
                        config[key] = checkKeys(logPrefix + ` > `, thisKey + ` / ` + key, config[key], defaults[key], addDefaults);
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

            const checkedConfig = checkKeys(`> `, `root config object`, config, defaultConfig, true);

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
        };

        const userConfig = JSON.parse(fs.readFileSync(`${global.configPath}/config.json`))

        let slashUsed = require('os').platform() == `win32` ? `\\` : `/`

        if(!userConfig.saveLocation) userConfig.saveLocation = (fs.existsSync(os.homedir() + `${slashUsed}Downloads`) ? os.homedir() + `${slashUsed}Downloads` : os.homedir()) + `${slashUsed}ezytdl`;

        firstCheckDone = true;

        userConfig.strings = require(`./configStrings.json`);

        if(userConfig.allowVideoConversion) require(`./util/determineGPUDecode.js`)();

        return userConfig;
    } catch(e) {
        errorHandler(e)
    }
}