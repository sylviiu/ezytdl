const platform = require('os').platform();

let file = `yt-dlp`;

if(platform === `win32`) file += `_win`;
if(platform === `linux`) file += `_linux`;
if(platform === `darwin`) file += `_macos`;

console.log(`System platform ${platform}; file name will be ${file}`);
console.log(`App data location: ${global.configPath}`);

const downloadPath = `${global.configPath}${require('os').platform() == `win32` ? `\\` : `/`}${file}`;

const systemPath = require(`which`).sync(`yt-dlp`, {nothrow: true});

module.exports = {
    platform, file: file.replace(`_win`, `.exe`), path: downloadPath, downloadPath, systemPath, getPath: () => {
        let systemPath = require(`which`).sync(`yt-dlp`, {nothrow: true});

        if(require('fs').existsSync(downloadPath)) {
            return require('path').join(downloadPath, file.replace(`_win`, `.exe`))
        } else if(systemPath) {
            return systemPath
        } else {
            return null
        }
    }
};