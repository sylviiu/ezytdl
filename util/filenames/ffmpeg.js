let platform = require('os').platform();

if(platform == `win32`) platform = `win`

const archString = process.arch.startsWith(`x`) ? process.arch.slice(1) : process.arch;

let file = platform + archString;

console.log(`System platform ${platform}; file name will be ${file}`);
console.log(`App data location: ${global.configPath}`);

const s = require('os').platform() == `win32` ? `\\` : `/`

const downloadPath = require(`path`).join(global.configPath, `ffmpeg-${file}`);

const fs = require('fs')
const pfs = require(`../promisifiedFS`)

if(fs.existsSync(downloadPath) && !fs.existsSync(require('path').join(downloadPath + '/'))) {
    console.log(`Not a directory. Removing.`)
    fs.unlinkSync(downloadPath)
}

let systemPath = require(`which`).sync(`ffmpeg`, {nothrow: true});

let usableFFmpegPath = null;

const checkFFmpeg = (auto=false) => new Promise(async res => {
    if(!auto && module.exports.lastCheckedFFmpeg > Date.now() - 1000) return res(usableFFmpegPath);

    if(!auto) module.exports.lastCheckedFFmpeg = Date.now();

    systemPath = await require(`which`)(`ffmpeg`, {nothrow: true});

    if(await pfs.existsSync(downloadPath)) {
        usableFFmpegPath = downloadPath + s + (await pfs.readdirSync(downloadPath))[0] + s + `bin` + s + `ffmpeg${require('os').platform() == `win32` ? `.exe` : ``}`
    } else if(systemPath) {
        usableFFmpegPath = systemPath
    } else {
        usableFFmpegPath = null
    }

    res(usableFFmpegPath)
});

setInterval(() => checkFFmpeg(true), 30000); checkFFmpeg(true);

let usableFFprobePath = null;

const checkFFprobe = (auto=false) => new Promise(async res => {
    if(!auto && module.exports.lastCheckedFFprobe > Date.now() - 1000) return res(usableFFprobePath);

    if(!auto) module.exports.lastCheckedFFprobe = Date.now();

    let systemFFprobe = await require(`which`)(`ffprobe`, {nothrow: true});

    if(require('fs').existsSync(downloadPath)) {
        usableFFprobePath = downloadPath + s + (await pfs.readdirSync(downloadPath))[0] + s + `bin` + s + `ffprobe${require('os').platform() == `win32` ? `.exe` : ``}`
    } else if(systemFFprobe) {
        usableFFprobePath = systemFFprobe
    } else {
        usableFFprobePath = null
    }

    res(usableFFprobePath)
});

setInterval(() => checkFFprobe(true), 30000); checkFFmpeg(true);

module.exports = {
    platform, file, path: downloadPath, downloadPath, systemPath,
    lastCheckedFFmpeg: 0,
    lastCheckedFFprobe: 0,
    getPath: () => {
        checkFFmpeg();
        return usableFFmpegPath
    },
    getPathPromise: () => checkFFmpeg(),
    getFFprobe: () => {
        checkFFprobe();
        return usableFFprobePath
    },
    getFFprobePromise: () => checkFFprobe()
};