const createButton = (id, {
    icon,
    label,
    primaryColor = false,
}={}, extraStyleOpts={}) => {
    const button = useDocument.createElement(`a`);
    button.classList.add(`btn`);
    button.classList.add(`btn-primary`);
    button.setAttribute(`role`, `button`);
    button.id = id;
    button.style.background = `rgb(255,255,255)`;
    button.style.borderStyle = `none`;
    button.style.borderRadius = `100px`;
    button.style.height = `36px`;
    button.style.marginBottom = `16px`;
    button.style.marginRight = `6px`;
    button.style.color = `rgb(0,0,0)`;

    if(primaryColor) {
        button.classList.add(`ez-selected`)
    } else {
        button.classList.add(`ez-defaultop`)
    }

    if(icon) {
        console.log(`icon requested, label: ${icon}`)

        const useIcon = faIconExists('fas', icon, true, { marginRight: `8px` });

        console.log(useIcon)

        if(useIcon) button.appendChild(useIcon);
    };

    if(label) button.innerHTML += label;

    for(const key of Object.keys(extraStyleOpts)) {
        button.style[key] = extraStyleOpts[key];
    }

    return button;
}