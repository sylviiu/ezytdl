const htmlContent = [
    `<div>`,
        `<svg class="waves" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 24 150 28" preserveAspectRatio="none" shape-rendering="auto">`,
            `<defs>`,
            `    <path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v150h-352z" />`,
            `</defs>`,
            `<g class="parallax">`,
            `    <use xlink:href="#gentle-wave" x="48" y="0" fill="rgba(255,255,255,0.7" />`,
            `    <use xlink:href="#gentle-wave" x="48" y="3" fill="rgba(255,255,255,0.5)" />`,
            `    <use xlink:href="#gentle-wave" x="48" y="5" fill="rgba(255,255,255,0.3)" />`,
            `    <use xlink:href="#gentle-wave" x="48" y="7" fill="#fff" />`,
            `</g>`,
        `</svg>`,
    `</div>`
];

console.log(htmlContent.join(`\n`))

const generateWaves = (color) => {
    if(!color) {
        console.log(`no color provided, using system colors`, systemColors)
        color = systemColors
    };

    const { r, g, b } = color;

    const parentDiv = document.createElement(`div`);
    parentDiv.classList.add(`d-flex`);
    parentDiv.classList.add(`justify-content-center`)
    parentDiv.classList.add(`align-items-end`)
    parentDiv.style.width = `100vw`;
    parentDiv.style.height = `100%`;
    parentDiv.style.position = `absolute`;
    parentDiv.style.bottom = `0`;
    parentDiv.style.left = `0`;

    const nestedDiv = document.createElement(`div`);
    parentDiv.appendChild(nestedDiv);

    const svg = document.createElementNS(`http://www.w3.org/2000/svg`, `svg`);
    svg.setAttributeNS(null, `class`, `waves`);
    //svg.setAttributeNS(null, `xmlns`, `http://www.w3.org/2000/svg`);
    //svg.setAttributeNS(null, `xmlns:xlink`, `http://www.w3.org/1999/xlink`);
    svg.setAttributeNS(null, `viewBox`, `0 24 150 28`);
    svg.setAttributeNS(null, `preserveAspectRatio`, `none`);
    svg.setAttributeNS(null, `shape-rendering`, `auto`);
    nestedDiv.appendChild(svg);

    const defs = document.createElementNS(`http://www.w3.org/2000/svg`, `defs`);
    svg.appendChild(defs);

    const path = document.createElementNS(`http://www.w3.org/2000/svg`, `path`);
    path.id = `gentle-wave`;
    path.setAttribute(`d`, `M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z`);
    defs.appendChild(path);

    const gnode = document.createElementNS(`http://www.w3.org/2000/svg`, `g`);
    gnode.classList.add(`parallax`);

    const appendUse = (x, y, alpha) => {
        const use = document.createElementNS(`http://www.w3.org/2000/svg`, `use`);
        //use.setAttributeNS(null, `xlink:href`, `#gentle-wave`);
        use.setAttributeNS(`http://www.w3.org/1999/xlink`, `xlink:href`, `#gentle-wave`);
        use.setAttributeNS(null, `x`, x);
        use.setAttributeNS(null, `y`, y);
        use.setAttributeNS(null, `fill`, `rgba(${r}, ${g}, ${b}, ${alpha})`);
        gnode.appendChild(use);
    };

    appendUse(48, 0, 0.7);
    appendUse(48, 3, 0.5);
    appendUse(48, 5, 0.3);
    appendUse(48, 7, 1);

    svg.appendChild(gnode);

    return parentDiv;

    /*return htmlContent.map(s => {
        if(s.includes(`rgba(255,255,255`)) s = s.replace(`rgba(255,255,255`, `rgba(${r},${g},${b}`)
        if(s.includes(`#fff`)) s = s.replace(`#fff`, `rgb(${r},${g},${b})`)
        return s;
    }).join(`\n`)*/
}