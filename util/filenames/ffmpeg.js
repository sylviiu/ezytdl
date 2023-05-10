const platform = require('os').platform();
const arch = require('os').arch();

let file = `${platform}-${arch}`;

console.log(`System platform ${platform}; file name will be ${file}`);
console.log(`App data location: ${global.configPath}`);

const downloadPath = `${global.configPath}${require('os').platform() == `win32` ? `\\` : `/`}ffmpeg-${file}${platform === `win32` ? `.exe` : ``}`;

const systemPath = require(`which`).sync(`ffmpeg`, {nothrow: true});

module.exports = {
    platform, file, path: downloadPath, downloadPath, systemPath, getPath: () => {
        if(require('fs').existsSync(downloadPath)) {
            return downloadPath
        } else if(systemPath) {
            return systemPath
        } else {
            return null
        }
    }
};