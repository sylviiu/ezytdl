const platform = require('os').platform();

let file = `yt-dlp`;

if(platform === `win32`) file += `.exe`;
if(platform === `linux`) file += `_linux`;
if(platform === `darwin`) file += `_macos`;

console.log(`System platform ${platform}; file name will be ${file}`);
console.log(`App data location: ${global.configPath}`);

const path = `${global.configPath}${require('os').platform() == `win32` ? `\\` : `/`}${file}`;

module.exports = {
    platform, file, path
};