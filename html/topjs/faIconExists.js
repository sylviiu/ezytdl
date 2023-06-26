var faIconExists = (faType, name, returnIcon, iconStyle) => {
    const tempElement = document.createElement(`i`);

    tempElement.classList.add(`${faType}`);
    tempElement.classList.add(`fa-${name}`);

    tempElement.style.display = `none`;
    tempElement.style.position = `absolute`

    document.body.appendChild(tempElement);

    const exists = window.getComputedStyle(tempElement, '::before').getPropertyValue('content') != `none`;

    tempElement.remove();

    if(returnIcon && exists) {
        tempElement.style.display = ``;
        tempElement.style.position = ``;

        if(iconStyle) for(const key of Object.keys(iconStyle)) {
            tempElement.style[key] = iconStyle[key];
        }

        return tempElement;
    } else return exists;
}