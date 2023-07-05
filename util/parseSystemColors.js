const range = (val) => {
    val = Math.round(val)

    if (val < 0) return 0;
    if (val > 255) return 255;
    return val;
};

const tinycolor = require('tinycolor2');
const ColorScheme = require('color-scheme');

module.exports = ({ r, g, b }) => {
    const scm = new ColorScheme;

    const hex = tinycolor(`#${r.toString(16).toUpperCase()}${g.toString(16).toUpperCase()}${b.toString(16).toUpperCase()}`).saturate(50).toHexString().replace(`#`, ``)

    const colors = scm.from_hex(hex)
    .scheme('analogic')
    .distance(0.9)
    .add_complement(false)
    .variation('pastel')
    .web_safe(false)
    .colors();

    const standard = colors[0];
    const light = tinycolor(`#` + colors[4]).saturate(25).brighten(25).toHexString().replace(`#`, ``);
    const dark = colors[1];

    const newColors = {
        standard: {
            r: range(parseInt(standard.slice(0, 2), 16)),
            g: range(parseInt(standard.slice(2, 4), 16)),
            b: range(parseInt(standard.slice(4, 6), 16)),
        },
        light: {
            r: range(parseInt(light.slice(0, 2), 16)),
            g: range(parseInt(light.slice(2, 4), 16)),
            b: range(parseInt(light.slice(4, 6), 16)),
        },
        dark: {
            r: range(parseInt(dark.slice(0, 2), 16)),
            g: range(parseInt(dark.slice(2, 4), 16)),
            b: range(parseInt(dark.slice(4, 6), 16)),
        },
        darker: {
            r: range(parseInt(dark.slice(0, 2), 16)/10),
            g: range(parseInt(dark.slice(2, 4), 16)/10),
            b: range(parseInt(dark.slice(4, 6), 16)/10),
        },
    };

    return newColors
}