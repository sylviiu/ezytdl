module.exports = {
    ffmpegPresets: (conf) => require(`../getConfig`)(conf, {
        source: `./util/ffmpegPresets.json`,
        target: `ffmpegPresets.json`,
        allowNonexistentRemoval: false,
        allowChangedDefaults: false,
    })
}