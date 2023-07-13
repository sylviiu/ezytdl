const parseSystemColors = ({ r, g, b }) => {
    const range = (val) => {
        val = Math.round(val)
    
        if (val < 0) return 0;
        if (val > 255) return 255;
        return val;
    };

    const scm = new ColorScheme;

    const strings = [r.toString(16).toUpperCase(), g.toString(16).toUpperCase(), b.toString(16).toUpperCase()];

    for(let i = 0; i < strings.length; i++) {
        if(strings[i].length == 1) strings[i] = `0` + strings[i];
    }

    const originalHex = `#${strings.join(``)}`

    const hex = tinycolor(originalHex).saturate(50).toHexString().replace(`#`, ``)

    const colors = scm.from_hex(hex)
    .scheme('analogic')
    .distance(0.9)
    .add_complement(true)
    .variation('pastel')
    .web_safe(true)
    .colors();

    const createColorsObj = (...index) => {
        const standard = colors[index[0]];
        const dark = colors[index[1]];
        const darker = tinycolor(`#` + colors[index[1]]).saturate(-15).toHexString().replace(`#`, ``);
        const light = tinycolor(`#` + colors[index[2]]).toHexString().replace(`#`, ``);

        const colorsObj = {
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
                r: range(parseInt(darker.slice(0, 2), 16)/6),
                g: range(parseInt(darker.slice(2, 4), 16)/6),
                b: range(parseInt(darker.slice(4, 6), 16)/6),
            },
        }

        //console.log(`picked colors ${standard}, ${dark}, ${light} from offsets ${index.join(`, `)} with original hex ${originalHex} -> ${hex}`, colorsObj)

        return colorsObj
    };

    return [ createColorsObj(0, 1, 2), createColorsObj(4, 5, 6), createColorsObj(8, 9, 10), createColorsObj(12, 13, 14) ]
}