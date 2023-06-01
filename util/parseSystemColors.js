const range = (val) => {
    val = Math.round(val)

    if (val < 0) return 0;
    if (val > 255) return 255;
    return val;
}

module.exports = ({ r, g, b }) => {
    const lowest = Math.min(r, g, b);
    return {
        standard: {
            r: range(r),
            g: range(g),
            b: range(b),
        },
        light: {
            r: range(r + ((255-lowest)/2)),
            g: range(g + ((255-lowest)/2)),
            b: range(b + ((255-lowest)/2)),
        },
        dark: {
            r: range(r/7.5),
            g: range(g/7.5),
            b: range(b/7.5),
        },
        darker: {
            r: range(r/10),
            g: range(g/10),
            b: range(b/10),
        },
    }
}