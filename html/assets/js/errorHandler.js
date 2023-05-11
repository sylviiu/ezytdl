const addNotification = container => {
    const { width, height } = container.getBoundingClientRect();
    container.style.top = `${document.getElementById(`navigationBar`).getBoundingClientRect().offsetHeight + 20}px`;
    container.style.right = `${0 - width}px`;

    const existingBoxes = document.querySelectorAll(`#errorBox`);

    if(existingBoxes) anime({
        targets: existingBoxes,
        top: `-=${height}px`,
        easing: `easeOutExpo`,
        duration: 1000,
    });

    document.body.appendChild(container);

    anime({
        targets: container,
        right: `+=${width}px`,
        easing: `easeOutExpo`,
        duration: 1000,
        delay: 150,
    });

    setTimeout(() => {
        anime({
            targets: container,
            right: `-=${width}px`,
            easing: `easeInExpo`,
            duration: 1000,
            complete: () => {
                document.body.removeChild(container);
            }
        });
    }, 8000)
}

const createNotification = ({ headingText, bodyText, type }) => {
    const container = document.createElement(`div`);

    if(type == `error`) {
        container.style.background = `rgba(176,29,29,0.5)`
    } else if(type == `warn`) {
        container.style.background = `rgba(176,176,29,0.5)`
    } else {
        container.style.background = `rgba(0,0,0,0.5)`
    }

    container.style.maxWidth = `250px`;
    container.style.borderRadius = `18px`;

    container.style.position = `fixed`;
    
    container.id = `errorBox`
    
    container.classList.add(`container-fluid`);
    container.classList.add(`align-items-end`);
    container.classList.add(`justify-content-end`);
    
    container.style.padding = `15px 10px`;
    container.style.margin = `20px`;
    
    const heading = document.createElement(`h5`);
    heading.id = `errorHeading`;
    heading.innerText = headingText || `An internal error has occurred!`;
    heading.style.marginBottom = `6px`;
    container.appendChild(heading);

    const body = document.createElement(`h6`);
    body.id = `errorBody`
    body.innerText = bodyText || `-- unknown --`;
    container.appendChild(body);

    addNotification(container);

    return container;
};

createNotification({
    headingText: `An internal error has occurred!`,
    bodyText: `yeah`,
    type: `error`
})