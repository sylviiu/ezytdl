const platform = require('os').platform();

let file = `bridge-${platform.replace(`win32`, `win32.exe`)}`;

console.log(`System platform ${platform}; file name will be ${file}`);
console.log(`App data location: ${global.configPath}`);

const path = require(`path`).join(global.configPath, file)

module.exports = {
    platform, file: file, path, downloadPath: global.configPath, systemPath: null, getPath: () => {
        if(require('fs').existsSync(path)) {
            return path
        } else {
            return null
        }
    }
};