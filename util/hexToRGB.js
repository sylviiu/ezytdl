module.exports = (hex) => {
    if(hex.startsWith(`#`)) hex = hex.slice(1);

    if(hex.length === 3) hex = hex.split(``).map(c => c.repeat(2)).join(``);

    const [r, g, b] = hex.match(/.{2}/g).map(c => parseInt(c, 16));

    return { r, g, b };
}