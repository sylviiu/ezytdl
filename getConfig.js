const errorAndExit = require("./util/errorAndExit.js");

const fs = require('fs');
const os = require('os')

let checked = false;

module.exports = (configObject) => {
    try {
        const defaultConfig = require(`./defaultConfig.json`)
    
        fs.mkdirSync(global.configPath, { recursive: true, failIfExists: false });

        if(!fs.existsSync(`${global.configPath}/config.json`)) {
            fs.writeFileSync(`${global.configPath}/config.json`, JSON.stringify(defaultConfig, null, 4), { encoding: `utf-8` });
            checked = true;
        };
        
        if(configObject) {
            const config = JSON.parse(fs.readFileSync(`${global.configPath}/config.json`));
            
            fs.writeFileSync(`${global.configPath}/config.json`, JSON.stringify(Object.assign({}, config, configObject), null, 4), { encoding: `utf-8` });
        };
        
        if(!checked) {
            const config = JSON.parse(fs.readFileSync(`${global.configPath}/config.json`));
    
            for(const key in defaultConfig) {
                if(!config[key]) {
                    config[key] = defaultConfig[key];
                    checked = true;
                }
            }
    
            if(checked) fs.writeFileSync(`${global.configPath}/config.json`, JSON.stringify(config, null, 4), { encoding: `utf-8` });
        };

        const userConfig = JSON.parse(fs.readFileSync(`${global.configPath}/config.json`))

        let slashUsed = global.configPath[1] == `:` ? `\\` : `/`

        if(!userConfig.saveLocation) userConfig.saveLocation = (fs.existsSync(os.homedir() + `${slashUsed}Downloads`) ? os.homedir() + `${slashUsed}Downloads` : os.homedir()) + `${slashUsed}ezytdl`;

        return userConfig;
    } catch(e) {
        errorAndExit(`Failed to create config folder: ${e}`)
    }
}