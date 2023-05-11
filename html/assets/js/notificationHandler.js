const addNotification = container => {
    container.style.opacity = 0;

    document.body.appendChild(container);
    const { width, height } = container.getBoundingClientRect();
    document.body.removeChild(container);

    container.style.opacity = 1

    console.log(`width: ${width}, height: ${height}`)

    container.style.top = `${document.getElementById(`navigationBar`).getBoundingClientRect().height + 20}px`;
    container.style.right = `${0 - width - 20}px`;

    console.log(`old right: ${container.style.right}}`)

    const existingBoxes = document.querySelectorAll(`.errorBox`);
    const existingBoxesArray = [...existingBoxes]

    existingBoxesArray.forEach((e, i) => {
        const newTop = parseInt(e.style.top) + existingBoxesArray.slice(0, existingBoxesArray.findIndex(o => o.id == e.id)) + 20;

        anime({
            targets: e,
            top: `${newTop}px`,
            easing: `easeOutExpo`,
            duration: 1000,
        });
    })

    document.body.appendChild(container);

    anime({
        targets: container,
        right: `+=${width + 20}px`,
        easing: `easeOutExpo`,
        duration: 1000,
        delay: 0,
        complete: () => {
            console.log(`new right: ${container.style.right}}`)
        }
    });

    setTimeout(() => {
        anime({
            targets: container,
            right: `-=${width + 20}px`,
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

    container.classList.add(`errorBox`)

    container.style.color = `white`

    if(type == `error`) {
        container.style.background = `rgba(176,29,29,0.5)`
    } else if(type == `warn`) {
        container.style.background = `rgba(176,176,29,0.5)`
    } else {
        container.style.background = `rgba(0,0,0,0.5)`
    }

    container.style.maxWidth = `450px`;
    container.style.borderRadius = `18px`;

    container.style.position = `fixed`;
    
    container.id = `errorBox-${idGen(8)}`
    
    container.classList.add(`container-fluid`);
    container.classList.add(`align-items-end`);
    container.classList.add(`justify-content-end`);
    
    container.style.padding = `10px 15px`;
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
});

setTimeout(() => {
    createNotification({
        headingText: `An internal error has occurred!`,
        bodyText: `yeah`,
        type: `warn`
    })
},150)

setTimeout(() => {
    createNotification({
        headingText: `An internal error has occurred!`,
        bodyText: `yeah`,
        type: `yeah`
    })
},500)

setTimeout(() => {
    createNotification({
        headingText: `An internal error has occurred!`,
        bodyText: `yeah`,
        type: `warn`
    })
},560)