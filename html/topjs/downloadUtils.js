var createDownloadManager = (card, id) => {
    const btn = card.querySelector(`#formatDownload`);

    const progress = addProgressBar(card.querySelector(`#leftContent`), null, null, { align: `left`, usePercentText: true })
    
    progress.setProgress(null);
    
    const formatName = card.querySelector(`#formatName`);
    const formatSubtext = card.querySelector(`#formatSubtext`);

    formatSubtext.innerHTML = `Starting...`;
    if(formatSubtext.classList.contains(`d-none`)) formatSubtext.classList.remove(`d-none`);

    const fileFormat = card.querySelector(`#fileFormat`)
    
    fileFormat.innerHTML = `0%`;

    let location;
    let destinationFile;

    let status = {};
    let otherProgBars = {};

    const updateProg = (k, obj) => {
        const id = k.split(`-`)[1];

        let clearTimer = () => {
            if(typeof otherProgBars[id] != `undefined` && otherProgBars[id].deleteTimer) {
                clearTimeout(otherProgBars[id].deleteTimer);
                otherProgBars[id].deleteTimer = null;
            }
        }

        if(typeof obj == `object`) {
            clearTimer();

            if(!otherProgBars[id]) {
                console.log(`Creating other progress bar for ${id}`)
                const newProgBar = addProgressBar(card.querySelector(`#leftContent`), `85%`, null, { align: `left` });
                newProgBar.setProgress(null);
                otherProgBars[id] = newProgBar;
            }

            let newNum = typeof obj.progressNum == `number` ? obj.progressNum : undefined;
            let newStr = typeof obj.status == `string` ? obj.status : undefined;

            if(otherProgBars[id].newNum == newNum) newNum = undefined
            else if(newNum) otherProgBars[id].newNum = newNum;

            if(otherProgBars[id].newStr == newStr) newStr = undefined
            else if(newStr) otherProgBars[id].newStr = newStr;

            console.log(`Updating other progress bar for ${id} (progressNum: ${newNum}, status: ${newStr})`)
            otherProgBars[id].setProgress(newNum, newStr);
        } else if(typeof obj == `string`) {
            clearTimer();
            
            if(!otherProgBars[id]) {
                const node = formatSubtext.cloneNode(true);

                otherProgBars[id] = {
                    node,
                    remove: () => node.remove()
                };

                node.id = `formatSubtext-${id}`;
                node.style.marginTop = `8px`;
                node.style.fontWeight = `normal`;
                node.style.fontSize = `0.9em`;
                card.querySelector(`#leftContent`).appendChild(otherProgBars[id].node);
            };

            otherProgBars[id].node.innerHTML = obj;
        } else {    
            if(typeof otherProgBars[id] != `undefined` && !otherProgBars[id].deleteTimer) otherProgBars[id].deleteTimer = setTimeout(() => {
                console.log(`Removing other progress bar for ${id}`, obj)
                otherProgBars[id].remove();
                delete otherProgBars[id];
            }, 150)
        }
    }

    const refreshProgBars = () => {
        const allProgObjs = Object.keys(status).filter(k => k.startsWith(`progress-`));

        const notCreated = allProgObjs.filter(k => !otherProgBars[k.split(`-`)[1]]);

        if(notCreated.length > 0) notCreated.forEach(k => status[k] ? updateProg(k, status[k]) : null);

        const deleted = Object.keys(otherProgBars).filter(k => !allProgObjs.includes(`progress-${k}`));

        if(deleted.length > 0) deleted.forEach(k => updateProg(k, null));
    }

    setTimeout(() => {
        if(status.percentNum) {
            console.log(status.percentNum)
            progress.setProgress(status.percentNum);
            if(status.percentNum >= 0) {
                if(fileFormat.classList.contains(`d-none`)) fileFormat.classList.remove(`d-none`);
                fileFormat.innerHTML = `${status.percentNum}%`;
            } else {
                if(!fileFormat.classList.contains(`d-none`)) fileFormat.classList.add(`d-none`);
            }
        };
        setTimeout(() => refreshProgBars(), 50)
    }, 50);

    const update = (m) => {
        if(m) {
            Object.assign(status, m);

            if(m.saveLocation) location = m.saveLocation;

            if(status.destinationFilename && status.formatID) {
                const titleStr = `[${status.formatID}] ${status.destinationFilename}`;
                if(formatName.innerHTML != titleStr) formatName.innerHTML = titleStr
            };

            //refreshProgBars();
            
            const updatedProgObjs = Object.keys(status).filter(k => k.startsWith(`progress-`));

            if(updatedProgObjs.length > 0) setTimeout(() => updatedProgObjs.forEach(k => updateProg(k, m[k])), 50);

            if(status.live) {
                progress.setProgress(-1);
                fileFormat.innerHTML = `LIVE`;
            } else if(m.percentNum) {
                console.log(m.percentNum)
                progress.setProgress(m.percentNum);
                if(m.percentNum >= 0) {
                    if(fileFormat.classList.contains(`d-none`)) fileFormat.classList.remove(`d-none`);
                    fileFormat.innerHTML = `${m.percentNum}%`;
                } else {
                    if(!fileFormat.classList.contains(`d-none`)) fileFormat.classList.add(`d-none`);
                }
            }
    
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
        fileFormat.innerHTML = `Done!`;

        btn.disabled = false;

        const btn2 = card.querySelector(`#pausePlayButton`);

        card.querySelector(`#trashicon`).classList.remove(`d-none`);
        card.querySelector(`#pauseicon`).classList.add(`d-none`);

        btn2.onclick = () => mainQueue.deleteFiles(id || ``);

        btn2.classList.remove(`d-none`);

        if(!card.querySelector(`#eta`).classList.contains(`d-none`)) card.querySelector(`#eta`).classList.add(`d-none`);
        if(!card.querySelector(`#speed`).classList.contains(`d-none`)) card.querySelector(`#speed`).classList.add(`d-none`);
    };

    return { update, complete, status, progress }
}

var startDownload = (originalCard, opt) => {
    opt.extraArguments = document.getElementById(`extraArguments`).value;

    if(config.reduceAnimations) {
        mainQueue.download(opt);
        anime({
            targets: originalCard.children || originalCard,
            opacity: 0,
            duration: 500,
            easing: `easeOutExpo`,
            complete: () => {
                if(originalCard.parentNode) originalCard.parentNode.removeChild(originalCard);
            }
        })
    } else if(config.disableAnimations) {
        mainQueue.download(opt);
        if(originalCard.parentNode) originalCard.parentNode.removeChild(originalCard);
    } else {
        const downloadsListBtn = document.getElementById(`downloadsList`);
        const targetPosition = downloadsListBtn.getBoundingClientRect();
    
        let formatDownloadButtonPosition
    
        if(originalCard.querySelector(`#formatDownload`)) {
            formatDownloadButtonPosition = originalCard.querySelector(`#formatDownload`).getBoundingClientRect();
        } else {
            formatDownloadButtonPosition = originalCard.getBoundingClientRect();
        }
    
        const card = originalCard.cloneNode(true);
    
        card.opacity = 1;
        card.style.opacity = 1;
    
        card.id += `-clone`;
    
        const currentPosition = originalCard.getBoundingClientRect();
        
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
    
        //setTimeout(() => mainQueue.download(opt), 780);
        
        setTimeout(() => {
            let currentX = card.getBoundingClientRect().x;
    
            setTimeout(() => {
                currentX = card.getBoundingClientRect().x;
            }, 450);
    
            const targetPosition = downloadsListBtn.getBoundingClientRect();
    
            console.log(currentPosition, targetPosition);
    
            anime({
                targets: card,
                //left: `${targetPosition.x}px`,
                top: `${targetPosition.y}px`,
                duration: 500,
                easing: `easeInExpo`,
                complete: () => {
                    mainQueue.download(opt);
                    card.opacity = 0;
                    if(card.parentNode) card.parentNode.removeChild(card);
    
                    if(downloadsListBtn.style.position != `relative`) downloadsListBtn.style.position = `relative`

                    const newTarget = downloadsListBtn.getBoundingClientRect()
    
                    newTarget.x -= 6
    
                    anime({
                        targets: downloadsListBtn,
                        filter: [`invert(1)`, `invert(0)`],
                        top: [((newTarget.y - formatDownloadButtonPosition.y)/15), 0],
                        left: [((newTarget.x - currentX)/15), 0],
                        duration: 400,
                        easing: `easeOutExpo`,
                    });
                }
            });
        }, 350);
    }
}