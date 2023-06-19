var faIconExists = (faType, name) => {
    const tempElement = document.createElement(`i`);

    tempElement.classList.add(`${faType}`);
    tempElement.classList.add(`fa-${name}`);

    tempElement.style.display = `none`;
    tempElement.style.position = `absolute`

    document.body.appendChild(tempElement);

    const exists = window.getComputedStyle(tempElement, '::before').getPropertyValue('content') != `none`;

    tempElement.remove();
    
    return exists;
}