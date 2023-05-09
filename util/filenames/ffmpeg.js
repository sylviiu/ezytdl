const platform = require('os').platform();
const arch = require('os').arch();

let file = `${platform}-${arch}`;

console.log(`System platform ${platform}; file name will be ${file}`);
console.log(`App data location: ${global.configPath}`);

const path = `${global.configPath}${require('os').platform() == `win32` ? `\\` : `/`}ffmpeg-${file}${platform === `win32` ? `.exe` : ``}`;

module.exports = {
    platform, file, path
};