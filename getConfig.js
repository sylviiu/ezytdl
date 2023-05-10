const errorHandler = require("./util/errorHandler.js");

const fs = require('fs');
const os = require('os');

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
            //console.log(logPrefix + `Checking keys of ${thisKey}...`);

            for(const key of Object.keys(defaults)) {
                //console.log(logPrefix + ` | ${key}...`, defaults[key])

                if(!config[key]) {
                    config[key] = defaults[key];
                    checked = true;
                };
                
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

        return userConfig;
    } catch(e) {
        errorHandler(e)
    }
}