const parseSystemColors = ({ r, g, b, customTheme }) => {
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
    };

    const originalHex = `#${strings.join(``)}`

    console.log(`ORIGINAL COLOR HEX`, originalHex)

    const hex = tinycolor(originalHex).saturate(50).toHexString().replace(`#`, ``);

    const customColors = [];

    const createScheme = (hex) => {
        const value = scm
        .scheme('analogic')
        .distance(0.9)
        .add_complement(true)
        .variation('pastel')
        .web_safe(true)
        .from_hex(hex)
        .colors();

        return value;
    }

    if(customTheme && typeof customTheme == `object`) {
        const cobj = customTheme;

        if(cobj.download) {
            let dl = createScheme(cobj.download.slice(1))
            customColors[0] = dl[0]
            customColors[1] = dl[1]
            customColors[2] = dl[2]
        }

        if(cobj.convert) {
            let cv = createScheme(cobj.convert.slice(1))
            customColors[4] = cv[0]
            customColors[5] = cv[1]
            customColors[6] = cv[2]
        };

        console.log(`CUSTOM THEME COLORS`, cobj, customColors)
    }

    const baseColors = createScheme(hex);

    const colors = Object.assign([], baseColors, customColors);

    console.log(`color scheme`, colors, `base`, baseColors, `custom`, customColors, `cfg`, customTheme)

    const createColorsObj = (...index) => {
        const standard = colors[index[0]];
        const dark = colors[index[1]];
        const darker = tinycolor(`#` + colors[index[1]]).saturate(-15).toHexString().replace(`#`, ``);
        const light = tinycolor(`#` + colors[index[2]]).toHexString().replace(`#`, ``);
        const lighter = tinycolor(`#` + colors[index[2]]).saturate(45).toHexString().replace(`#`, ``);

        console.log(`CREATING COLORS FOR`, index, index.map(n => colors[n]))

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
            lighter: {
                r: range(parseInt(lighter.slice(0, 2), 16)),
                g: range(parseInt(lighter.slice(2, 4), 16)),
                b: range(parseInt(lighter.slice(4, 6), 16)),
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

    return [ createColorsObj(0, 1, 2), createColorsObj(4, 5, 6)/*, createColorsObj(8, 9, 10), createColorsObj(12, 13, 14)*/ ]
}