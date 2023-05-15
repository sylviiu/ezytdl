function createDownloadManager(card, id) {
    const btn = card.querySelector(`#formatDownload`);

    const bar = card.querySelector(`#progressBar`);
    const fill = card.querySelector(`#progressFill`);

    const dotSize = Number.parseInt(fill.style.width.replace(`px`, ``));
    const range = Number.parseInt(bar.style.width.replace(`px`, ``)) - dotSize;
    
    const formatName = card.querySelector(`#formatName`);
    const formatSubtext = card.querySelector(`#formatSubtext`);

    formatSubtext.innerHTML = `Starting...`;
    if(formatSubtext.classList.contains(`d-none`)) formatSubtext.classList.remove(`d-none`);
    
    card.querySelector(`#fileFormat`).innerHTML = `0%`;

    let location;
    let destinationFile;

    const update = (m) => {
        if(m) {
            if(m.saveLocation) location = m.saveLocation;
    
            if(m.percentNum) {
                if(bar.classList.contains(`d-none`)) bar.classList.remove(`d-none`);
    
                if(m.percentNum == -1) {
                    anime.remove(fill)
                    anime({
                        targets: fill,
                        width: `${dotSize}px`,
                        duration: 350,
                        easing: `easeOutExpo`,
                    })
                } else {
                    const setWidth = `${dotSize + (range * m.percentNum/100)}px`;
                    //console.log(`Downloaded ${m.percentNum} -- bar width: ${setWidth}`)
    
                    card.querySelector(`#fileFormat`).innerHTML = `${m.percentNum}%`;
                    
                    anime.remove(fill)
                    anime({
                        targets: fill,
                        width: setWidth,
                        duration: 350,
                        easing: `easeOutExpo`,
                    })
                }
            };
    
            if(m.downloadSpeed) {
                if(card.querySelector(`#speed`).classList.contains(`d-none`)) card.querySelector(`#speed`).classList.remove(`d-none`);
                card.querySelector(`#speed`).innerHTML = m.downloadSpeed
            };
    
            if(m.eta) {
                if(card.querySelector(`#eta`).classList.contains(`d-none`)) card.querySelector(`#eta`).classList.remove(`d-none`);
                card.querySelector(`#eta`).innerHTML = m.eta
            };
    
            if(m.status) card.querySelector(`#formatSubtext`).innerHTML = m.status;
    
            if(m.destinationFile) destinationFile = m.destinationFile
        }
    };

    const complete = () => {
        card.querySelector(`#fileFormat`).innerHTML = `Done!`;

        //btn.onclick = () => 

        btn.disabled = false;

        const btn2 = card.querySelector(`#pausePlayButton`);

        card.querySelector(`#fileicon`).classList.remove(`d-none`);
        card.querySelector(`#pauseicon`).classList.add(`d-none`);

        btn2.onclick = () => mainQueue.openDir(id || ``);

        btn2.classList.remove(`d-none`);

        //formatName.innerHTML = `Saved to: ${location}`
        if(!card.querySelector(`#eta`).classList.contains(`d-none`)) card.querySelector(`#eta`).classList.add(`d-none`);
        if(!card.querySelector(`#speed`).classList.contains(`d-none`)) card.querySelector(`#speed`).classList.add(`d-none`);
    };

    return { update, complete }
}

const removeElements = (card, opt) => {
    const current = {
        width: card.offsetWidth,
        height: card.offsetHeight,
    };

    if(opt == true) opt == {margin: true, padding: true};

    const { margin, padding } = opt;

    card.style.removeProperty(`max-width`);
    card.style.removeProperty(`min-width`);
    card.style.removeProperty(`min-height`);
    card.style.removeProperty(`max-height`);

    card.style.removeProperty(`width`);
    card.style.removeProperty(`height`);

    if(margin) {
        card.style.removeProperty(`margin`);
        card.style.removeProperty(`margin-top`);
        card.style.removeProperty(`margin-left`);
        card.style.removeProperty(`margin-right`);
        card.style.removeProperty(`margin-bottom`);
    }

    if(padding) {
        card.style.removeProperty(`padding`);
        card.style.removeProperty(`padding-bottom`);
        card.style.removeProperty(`padding-left`);
        card.style.removeProperty(`padding-right`);
        card.style.removeProperty(`padding-top`);
    }

    return current;
}

const startDownload = (originalCard, opt) => {
    const downloadsListBtn = document.getElementById(`downloadsList`);
    const targetPosition = downloadsListBtn.getBoundingClientRect();

    let formatDownloadButtonPosition

    if(originalCard.querySelector(`#formatDownload`)) {
        formatDownloadButtonPosition = originalCard.querySelector(`#formatDownload`).getBoundingClientRect();
    } else {
        formatDownloadButtonPosition = originalCard.getBoundingClientRect();

        formatDownloadButtonPosition.x += formatDownloadButtonPosition.width/2;
        formatDownloadButtonPosition.y += formatDownloadButtonPosition.height/2;

        formatDownloadButtonPosition.x += downloadsListBtn.style.width/2;
        formatDownloadButtonPosition.y -= downloadsListBtn.style.height/2;
    }

    const card = originalCard.cloneNode(true);

    card.opacity = 1;
    card.style.opacity = 1;

    card.id += `-clone`;

    const currentPosition = originalCard.getBoundingClientRect();
    
    //card.parentNode.removeChild(card);
    document.body.appendChild(card);

    originalCard.style.opacity = 0;

    const originalCardValues = removeElements(originalCard, {padding: true})
    
    anime({
        targets: originalCard,
        minHeight: [originalCardValues.height, 0],
        maxHeight: [originalCardValues.height, 0],
        height: [originalCardValues.height, 0],
        minWidth: [originalCardValues.width, 0],
        maxWidth: [originalCardValues.width, 0],
        width: [originalCardValues.width, 0],
        marginBottom: 0,
        marginTop: 0,
        marginLeft: 0,
        marginRight: 0,
        margin: 0,
        duration: 1400,
        easing: `easeInOutExpo`,
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
        easing: `easeOutExpo`,
    });

    const widthHeightTransformObj = {
        targets: card,
        opacity: [1, 1],
        background: `rgb(255,255,255)`,
        borderRadius: targetPosition.width/2,
        //left: `${formatDownloadButtonPosition.x}px`,
        //top: `${formatDownloadButtonPosition.y}px`,
        duration: 800,
        easing: `easeInExpo`,
    };

    widthHeightTransformObj.minWidth = [originalCardValues.width, downloadsListBtn.style.width];
    //widthHeightTransformObj.minWidth = [downloadsListBtn.offsetWidth, downloadsListBtn.style.width];
    widthHeightTransformObj.maxWidth = [originalCardValues.width, downloadsListBtn.style.width];

    widthHeightTransformObj.minHeight = [originalCardValues.height, downloadsListBtn.style.height];
    //widthHeightTransformObj.minHeight = [downloadsListBtn.offsetHeight, downloadsListBtn.style.height];
    widthHeightTransformObj.maxHeight = [originalCardValues.height, downloadsListBtn.style.height];

    console.log(widthHeightTransformObj)
    anime(widthHeightTransformObj)
    
    anime({
        targets: card,
        left: `${targetPosition.x}px`,
        //top: `${targetPosition.y}px`,
        duration: 850,
        easing: `easeInQuad`,
    });

    setTimeout(() => mainQueue.download(opt), 780);
    
    setTimeout(() => {
        const targetPosition = downloadsListBtn.getBoundingClientRect();

        console.log(currentPosition, targetPosition)

        anime({
            targets: card,
            //left: `${targetPosition.x}px`,
            top: `${targetPosition.y}px`,
            duration: 500,
            easing: `easeInExpo`,
            complete: () => {
                /*if(downloadsWs) {
                    console.log(`found downloads websocket!`)
        
                    downloadsWs.send(JSON.stringify({
                        action: `download`,
                        data: opt,
                    }));
                } else console.log(`no downloads websocket found!`)*/

                card.opacity = 0;
                if(card.parentNode) card.parentNode.removeChild(card);

                const copy = downloadsListBtn.cloneNode(true);
                
                downloadsListBtn.style.opacity = 0;

                copy.onclick = () => downloadsListBtn.click();

                const newTarget = downloadsListBtn.getBoundingClientRect()

                newTarget.x -= 6

                copy.style.position = `fixed`;
                copy.style.left = `${newTarget.x}px`;
                copy.style.top = `${newTarget.y}px`;

                document.body.appendChild(copy);

                anime({
                    targets: copy,
                    filter: [`invert(1)`, `invert(0)`],
                    top: [newTarget.y-10, newTarget.y],
                    left: [newTarget.x+2, newTarget.x],
                    duration: 400,
                    easing: `easeOutExpo`,
                    complete: () => {
                        document.body.removeChild(copy);
                        downloadsListBtn.style.opacity = 1;
                    }
                })
            }
        });
    }, 350);
}