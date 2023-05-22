const throwNode = (originalCard, target, beforeCloneFunc, noClone) => {
    const targetPosition = target.getBoundingClientRect();

    console.log(`throwNode target pos`, targetPosition)

    //let formatDownloadButtonPosition = target.getBoundingClientRect();
    let formatDownloadButtonPosition;

    /*if(originalCard.querySelector(`#formatDownload`)) {
        formatDownloadButtonPosition = originalCard.querySelector(`#formatDownload`).getBoundingClientRect();
    } else {
        formatDownloadButtonPosition = originalCard.getBoundingClientRect();

        //formatDownloadButtonPosition.x += formatDownloadButtonPosition.width/2;
        //formatDownloadButtonPosition.y += formatDownloadButtonPosition.height/2;

        //formatDownloadButtonPosition.x += downloadsListBtn.style.width/2;
        //formatDownloadButtonPosition.y -= downloadsListBtn.style.height/2;
    }*/

    formatDownloadButtonPosition = originalCard.getBoundingClientRect();

    let card;

    if(!noClone) {
        card = originalCard.cloneNode(true);
    } else {
        card = originalCard;
    }

    card.opacity = 1;
    card.style.opacity = 1;

    card.id += `-clone`;

    const currentPosition = originalCard.getBoundingClientRect();
    
    //card.parentNode.removeChild(card);
    document.body.appendChild(card);

    originalCard.style.opacity = 0;

    const originalCardValues = removeElements(originalCard, {padding: true})
    
    if(!noClone) anime({
        targets: originalCard,
        //minHeight: [originalCardValues.height, 0],
        //maxHeight: [originalCardValues.height, 0],
        //height: [originalCardValues.height, 0],
        //minWidth: [originalCardValues.width, 0],
        //maxWidth: [originalCardValues.width, 0],
        //width: [originalCardValues.width, 0],
        minHeight: 0,
        maxHeight: 0,
        height: 0,
        minWidth: 0,
        maxWidth: 0,
        width: 0,
        marginBottom: 0,
        marginTop: 0,
        marginLeft: 0,
        marginRight: 0,
        margin: 0,
        duration: 1400,
        easing: `easeInOutCirc`,
        complete: () => {
            if(originalCard.parentNode) originalCard.parentNode.removeChild(originalCard);
        }
    });

    card.style.position = `fixed`;

    const newCardValues = removeElements(card, {padding: false, margin: true});

    card.style.left = `${currentPosition.x}px`;
    card.style.top = `${currentPosition.y}px`;

    //originalCard.opacity = 0;
    //document.body.appendChild(card);

    anime({
        targets: card.children,
        opacity: 0,
        duration: 500,
        easing: `easeOutCirc`,
    });

    const widthHeightTransformObj = {
        targets: card,
        opacity: [1, 1],
        background: `rgb(255,255,255)`,
        borderRadius: Math.floor(targetPosition.width, targetPosition.height)/2,
        //left: `${formatDownloadButtonPosition.x}px`,
        //top: `${formatDownloadButtonPosition.y}px`,
        duration: 800,
        easing: `easeInCirc`,
    };

    widthHeightTransformObj.minWidth = [formatDownloadButtonPosition.width, targetPosition.width];
    //widthHeightTransformObj.minWidth = [target.offsetWidth, target.style.width];
    widthHeightTransformObj.maxWidth = [formatDownloadButtonPosition.width, targetPosition.width];

    widthHeightTransformObj.minHeight = [formatDownloadButtonPosition.height, targetPosition.height];
    //widthHeightTransformObj.minHeight = [target.offsetHeight, target.style.height];
    widthHeightTransformObj.maxHeight = [formatDownloadButtonPosition.height, targetPosition.height];

    console.log(widthHeightTransformObj)
    anime(widthHeightTransformObj)
    
    anime({
        targets: card,
        left: `${originalCardValues.x}px`,
        //top: `${targetPosition.y}px`,
        duration: 850,
        easing: `easeInQuad`,
    });
    
    setTimeout(() => {
        let currentX = card.getBoundingClientRect().x;

        setTimeout(() => {
            currentX = card.getBoundingClientRect().x;
        }, 450);

        const targetPosition = target.getBoundingClientRect();

        console.log(currentPosition, targetPosition);

        anime({
            targets: card,
            //left: `${targetPosition.x}px`,
            top: `${targetPosition.y}px`,
            duration: 500,
            easing: `easeInCirc`,
            complete: () => {
                if(beforeCloneFunc) beforeCloneFunc();
                
                card.opacity = 0;
                if(card.parentNode) card.parentNode.removeChild(card);

                const copy = target.cloneNode(true);

                const c2 = copy.cloneNode(true);

                //const newTarget = removeElements(c2, {padding: false, margin: true});
                
                target.style.opacity = 0;

                copy.onclick = () => target.click();

                const newTarget = target.getBoundingClientRect()

                //newTarget.x -= 6

                copy.style.position = `fixed`;
                copy.style.left = `${newTarget.x}px`;
                copy.style.top = `${newTarget.y}px`;

                copy.style.width = newTarget.width + `px`;
                copy.style.maxWidth = newTarget.width + `px`;
                copy.style.height = newTarget.height + `px`;
                copy.style.maxHeight = newTarget.height + `px`;

                document.body.appendChild(copy);

                anime({
                    targets: copy,
                    filter: [`invert(1)`, `invert(0)`],
                    top: [((newTarget.y - formatDownloadButtonPosition.y)/15) + newTarget.y, newTarget.y],
                    left: [((newTarget.x - currentX)/15) + newTarget.x, newTarget.x],
                    duration: 400,
                    easing: `easeOutCirc`,
                    complete: () => {
                        document.body.removeChild(copy);
                        target.style.opacity = 1;
                    }
                })
            }
        });
    }, noClone ? 0 : 350);
}