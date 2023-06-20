let constantAddedHeight = 0;

const notificationMarkdownConverter = new showdown.Converter({ parseImgDimensions: true });

const repositionNotifications = (addHeight, constant) => {
    if(!addHeight || typeof addHeight != `number`) addHeight = 0;

    const existingBoxes = document.querySelectorAll(`.notificationBox`);
    const existingBoxesArray = [...existingBoxes].sort((a, b) => {
        const a1 = parseInt(a.id.split(`-`)[1]);
        const b1 = parseInt(b.id.split(`-`)[1]);

        return b1 - a1; // higher values / newer notifs go first
    }).map(e => e.id);

    let lastTop = document.getElementById(`navigationBar`).getBoundingClientRect().height;

    if(typeof addHeight == `number`) {
        lastTop += addHeight;
        if(constant) constantAddedHeight = addHeight;
    }
    
    if(!constant && typeof constantAddedHeight == `number`) lastTop += constantAddedHeight;

    for (i in existingBoxesArray) {
        let id = existingBoxesArray[i];
        let e = document.getElementById(id);
        
        //const olderNotifications = existingBoxesArray.reverse().slice(0, existingBoxesArray.findIndex(o => o.id == e.id));

        let newTop = lastTop

        if(i != 0) {
            let e2 = document.getElementById(existingBoxesArray[i - 1]);
            newTop += e2.getBoundingClientRect().height + parseInt(e2.margin ? e2.margin : `20px`);
        }

        //newTop += olderNotifications.reduce((a,b) => a + b.getBoundingClientRect().height + parseInt(b.margin ? b.margin : `20px`), 0);
        //newTop += addHeight;

        console.log(`pushing down ${e.id} (${e.querySelector(`#errorBody`) ? e.querySelector(`#errorBody`).innerHTML : `-- no body --`}) -- position: ${i}\n${e.style.top} -> ${newTop}`)

        lastTop = newTop

        console.log(`set top to ${existingBoxes[i].top}`)

        anime({
            targets: e,
            top: `${newTop}px`,
            easing: `easeOutExpo`,
            duration: 1000,
        });
    }
}

const addNotification = container => {
    container.style.opacity = 0;

    container.style.margin = `20px`;
    container.style.removeProperty(`marginTop`);
    container.style.removeProperty(`marginBottom`);
    container.style.removeProperty(`marginLeft`);
    container.style.removeProperty(`marginRight`);

    if(!container.onclick) container.onclick = () => {
        container.classList.remove(`notificationBox`)
        repositionNotifications();

        if(document.body.querySelector(`#${container.id}`)) anime({
            targets: container,
            right: `-=${container.getBoundingClientRect().width + 20}px`,
            easing: `easeOutExpo`,
            duration: 1000,
            complete: () => {
                if(document.body.querySelector(`#${container.id}`)) document.body.removeChild(container);
            }
        });
    }

    document.body.appendChild(container);
    const { width, height } = container.getBoundingClientRect();
    document.body.removeChild(container);

    container.style.opacity = 1

    console.log(`width: ${width}, height: ${height}`)

    container.style.top = `${document.getElementById(`navigationBar`).getBoundingClientRect().height + 20}px`;
    container.style.right = `${0 - width - 20}px`;

    console.log(`old right: ${container.style.right}}`)

    document.body.appendChild(container);

    repositionNotifications()

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
                if(document.body.querySelector(`#${container.id}`)) document.body.removeChild(container);
            }
        });
    }, 8000)
}

const createNotification = (opt, providedClickFunc) => {
    let { headingText, title, bodyText, content, redirect, type, stack, stackType } = opt;

    const container = document.createElement(`div`);

    const onClick = () => {
        if(redirect) {
            window.location.href = redirect;
        } else {
            container.classList.remove(`notificationBox`)
            repositionNotifications();

            if(document.body.querySelector(`#${container.id}`)) anime({
                targets: container,
                right: `-=${container.getBoundingClientRect().width + 20}px`,
                easing: `easeOutExpo`,
                duration: 1000,
                complete: () => {
                    if(document.body.querySelector(`#${container.id}`)) document.body.removeChild(container);
                }
            });
        }
    }

    container.onclick = () => {
        if(providedClickFunc && typeof providedClickFunc == `function`) providedClickFunc();
        onClick();
    }

    container.classList.add(`notificationBox`)

    container.style.color = `white`

    container.style.maxWidth = `450px`;
    container.style.borderRadius = `18px`;

    container.style.position = `fixed`;
    
    container.id = `notificationBox-${Date.now()}-${type || `notype`}-${idGen(8)}`
    
    container.classList.add(`container-fluid`);
    container.classList.add(`align-items-end`);
    container.classList.add(`justify-content-end`);

    container.style[`backdrop-filter`] = `blur(10px)`;

    if(opt instanceof HTMLElement) {
        const clone = opt.cloneNode(true);
        document.body.appendChild(clone);
        const { width, height } = opt.getBoundingClientRect();
        document.body.removeChild(clone);
        console.log(`custom object notification: width: ${width}, height: ${height}`)
        const elements = removeElements(clone, {margin: true});
        clone.style.position = `fixed`;
        //clone.style.minWidth = width;
        //clone.style.maxWidth = width;
        //clone.style.width = width;
        clone.style.minHeight = height + `px`;
        container.style.minHeight = height + `px`;
        //clone.style.maxHeight = height;
        //clone.style.height = height;
        clone.style.maxWidth = container.style.maxWidth
        //clone.classList.add(`notificationBox`)
        //clone.classList.add(`d-flex`)
        console.log(clone)
        container.appendChild(clone);
    } else {
        container.style.padding = `10px 15px`;

        if(type == `error`) {
            container.style.background = `rgba(176,29,29,0.5)`
        } else if(type == `warn`) {
            container.style.background = `rgba(217,81,23,0.5)`
        } else container.style.background = `rgba(0,0,0,0.5)`
        
        const heading = document.createElement(`h5`);
        heading.id = `errorHeading`;
        heading.innerText = headingText || title || `An internal error has occurred!`;
        heading.style.marginBottom = `6px`;
        container.appendChild(heading);
    
        const body = document.createElement(`p`);
        body.id = `errorBody`
        body.innerHTML = notificationMarkdownConverter.makeHtml((bodyText || content || `-- unknown --`).trim());
        container.appendChild(body);

        container.style.paddingBottom = `0px`;

        if(type == `error`) {
            const button = document.createElement(`a`);
            button.classList.add(`btn`);
            button.classList.add(`btn-primary`);
            button.setAttribute(`role`, `button`);
            button.id = `githubIssuesButton`;
            button.style.background = `rgb(255,255,255)`;
            button.style.borderStyle = `none`;
            button.style.borderRadius = `100px`;
            button.style.height = `36px`;
            button.style.marginBottom = `16px`;
            button.style.color = `rgb(0,0,0)`;
            //button.style.marginTop = `10px`;

            let reportStrings = [`## Type: ${type[0].toUpperCase() + type.slice(1)}`];

            if(headingText || title) reportStrings.push(`### Title: \n${headingText || title}`)
            if(bodyText || content) reportStrings.push(`### Content: \n${bodyText || content}`)
            if(stack) reportStrings.push(`### Stack: \n\`\`\`${stackType || `js`}\n${stack}\n\`\`\``)

            button.href = `https://github.com/sylviiu/ezytdl/issues/new?labels=bug&body=${encodeURIComponent(reportStrings.join(`\n\n`) + `\n\n### Below this line, please describe what caused this error.\n----\n`)}`;

            const icon = document.createElement(`i`);
            icon.classList.add(`fab`);
            icon.classList.add(`fa-github`);
            icon.style.marginRight = `6px`;

            button.appendChild(icon);
            button.appendChild(document.createTextNode(`Report on GitHub`));

            container.appendChild(button);
        }
    }

    addNotification(container);

    return container;
};

if(!document.getElementById(`disableNotifications`)) {
    notifications.handler((content) => createNotification(content));
    notifications.setReady();
}