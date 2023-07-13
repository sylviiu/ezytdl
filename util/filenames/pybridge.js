const platform = require('os').platform();

let file = `bridge-${platform.replace(`win32`, `win32.exe`)}`;

console.log(`System platform ${platform}; file name will be ${file}`);
console.log(`App data location: ${global.configPath}`);

const downloadPath = require(`path`).join(global.configPath, `bridge-${platform}`);

const path = require(`path`).join(downloadPath, file)

const fs = require('fs')

try {
    fs.readdirSync(downloadPath)
} catch(e) {
    if(fs.existsSync(downloadPath)) {
        fs.unlinkSync(downloadPath)
    }
}

module.exports = {
    platform, file, path, downloadPath, systemPath: null, getPath: () => {
        if(require('fs').existsSync(path)) {
            return path
        } else {
            return null
        }
    }
};