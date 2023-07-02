module.exports = {
    ffmpegPresets: (conf, o={}) => require(`../getConfig`)(conf, Object.assign({
        source: `./util/ffmpegPresets.json`,
        target: `ffmpegPresets.json`,
        allowNonexistentRemoval: false,
        allowChangedDefaults: false,
    }, o))
}