module.exports = {
    ffmpegPresets: (conf, o={}) => require(`../getConfig`)(conf, Object.assign({
        source: `./util/ffmpegPresets.json`,
        target: `ffmpegPresets.json`,
        allowNonexistentRemoval: false,
        allowChangedDefaults: false,
        values: true,
    }, o)),
    ffmpegGPUArgs: (conf, o={}) => require(`../getConfig`)(conf, Object.assign({
        source: `./util/ffmpegGPUArgs.json`,
        target: `ffmpegGPUArgs.json`,
        allowNonexistentRemoval: false,
        allowChangedDefaults: false,
        values: false,
    }, o)),
    ffmpegCodecArgs: (conf, o={}) => require(`../getConfig`)(conf, Object.assign({
        source: `./util/ffmpegCodecArgs.json`,
        target: `ffmpegCodecArgs.json`,
        allowNonexistentRemoval: false,
        allowChangedDefaults: false,
        values: false,
    }, o)),
    ytdlpExtraArgs: (conf, o={}) => require(`../getConfig`)(conf, Object.assign({
        source: `./util/ytdlpExtraArgs.json`,
        target: `ytdlpExtraArgs.json`,
        allowNonexistentRemoval: true,
        allowChangedDefaults: true,
        clearConfigCache: false,
    }, o)),
}