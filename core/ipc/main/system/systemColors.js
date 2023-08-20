module.exports = {
    type: `handle`,
    func: () => {
        const { systemPreferences } = require('electron');
        const hexToRGB = require(`../../../../util/hexToRGB`);
    
        return hexToRGB(typeof systemPreferences.getAccentColor == `function` ? systemPreferences.getAccentColor() : `b981fe`); // secondary was picked from image
    }
}