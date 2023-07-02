module.exports = {
    gpuArgs: (userConfig) => {
        const gpuArgs = require(`../util/ffmpegGPUArgs.json`);

        Object.assign(userConfig.strings, { hardwareAcceleratedConversionExtended: {}, });
        Object.assign(userConfig.descriptions, { hardwareAcceleratedConversionExtended: {}, });

        for(const key of Object.keys(gpuArgs)) {
            if(gpuArgs[key].platform.includes(process.platform)) {
                userConfig.strings.hardwareAcceleratedConversionExtended[key] = gpuArgs[key].name;
                userConfig.descriptions.hardwareAcceleratedConversionExtended[key] = gpuArgs[key].description;
            }
        };

        return userConfig;
    },
    ffmpegPresets: (userConfig) => {
        const ffmpegPresets = Object.values(require(`../util/configs`).ffmpegPresets());

        Object.assign(userConfig.strings, { ffmpegPresetsExtended: {}, });
        Object.assign(userConfig.descriptions, { ffmpegPresetsExtended: {}, });

        for(const {key, name, description} of ffmpegPresets) {
            userConfig.strings.ffmpegPresetsExtended[key] = name || `Unnamed preset.`;
            userConfig.descriptions.ffmpegPresetsExtended[key] = description || `No description provided.`;
        };

        return userConfig;
    }
}