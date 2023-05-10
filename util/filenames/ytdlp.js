const platform = require('os').platform();

let file = `yt-dlp`;

if(platform === `win32`) file += `.exe`;
if(platform === `linux`) file += `_linux`;
if(platform === `darwin`) file += `_macos`;

console.log(`System platform ${platform}; file name will be ${file}`);
console.log(`App data location: ${global.configPath}`);

const downloadPath = `${global.configPath}${require('os').platform() == `win32` ? `\\` : `/`}${file}`;

const systemPath = require(`which`).sync(`yt-dlp`, {nothrow: true});

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