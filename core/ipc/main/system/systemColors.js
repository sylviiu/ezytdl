const configs = require(`../../../../util/configs`);

module.exports = {
    type: `handle`,
    func: () => new Promise(async r => {
        const { systemPreferences } = require('electron');
        const hexToRGB = require(`../../../../util/hexToRGB`);
        const { style } = await require(`../../../../getConfig`)()

        const accent = systemPreferences?.getAccentColor?.();

        console.log(`ACCENT COLOR: ${accent}`);
    
        return r({ ...hexToRGB(typeof systemPreferences.getAccentColor == `function` ? systemPreferences.getAccentColor() : `b981fe`), customTheme: style.colors }); // secondary was picked from image
    })
}