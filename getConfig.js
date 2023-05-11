const errorHandler = require("./util/errorHandler.js");

const fs = require('fs');
const os = require('os');

const { sendNotification } = require("./util/downloadManager.js");

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
        
        if(configObject) {
            const config = JSON.parse(fs.readFileSync(`${global.configPath}/config.json`));
            
            fs.writeFileSync(`${global.configPath}/config.json`, JSON.stringify(Object.assign({}, config, configObject), null, 4), { encoding: `utf-8` });
        };

        const checkKeys = (logPrefix, thisKey, config, defaults) => {
            for(const key of Object.keys(defaults)) {
                if(typeof config[key] == `undefined`) {
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

                if(defaults[key] && typeof config[key] != typeof defaults[key]) {
                    sendNotification({
                        type: `warn`,
                        headingText: `Config key mismatch!`,
                        bodyText: `The config key "${key}" is missing or is of the wrong type! (Expected: ${typeof defaults[key]}, got: ${config[key] ? typeof config[key] : ``})`
                    });
                    console.log(config[key], defaults[key])
                    config[key] = defaults[key];
                    checked = true;
                }
                
                if(defaults[key] && typeof defaults[key] == `object`) checkKeys(logPrefix + ` > `, thisKey + ` / ` + key, config[key], defaults[key]);
            };

            return config;
        }
        
        if(!checked) {
            const config = JSON.parse(fs.readFileSync(`${global.configPath}/config.json`));

            const checkedConfig = checkKeys(`> `, `root config object`, config, defaultConfig);

            //console.log(config, checkedConfig)
            
            if(checked) fs.writeFileSync(`${global.configPath}/config.json`, JSON.stringify(config, null, 4), { encoding: `utf-8` });
        };

        const userConfig = JSON.parse(fs.readFileSync(`${global.configPath}/config.json`))

        let slashUsed = require('os').platform() == `win32` ? `\\` : `/`

        if(!userConfig.saveLocation) userConfig.saveLocation = (fs.existsSync(os.homedir() + `${slashUsed}Downloads`) ? os.homedir() + `${slashUsed}Downloads` : os.homedir()) + `${slashUsed}ezytdl`;

        firstCheckDone = true;

        return userConfig;
    } catch(e) {
        errorHandler(e)
    }
}