function createDownloadManager(card) {
    const btn = card.querySelector(`#formatDownload`);

    const bar = card.querySelector(`#progressBar`);
    const fill = card.querySelector(`#progressFill`);

    const dotSize = Number.parseInt(fill.style.width.replace(`px`, ``));
    const range = Number.parseInt(bar.style.width.replace(`px`, ``)) - dotSize;

    let location;

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
    
            //if(m.destinationFile) location = m.destinationFile
        }
    };

    const complete = () => {
        card.querySelector(`#fileFormat`).innerHTML = `Done!`;

        btn.onclick = () => {
            const req = new XMLHttpRequest();

            req.open("GET", `http://localhost:3000/openFolder/${encodeURI(btoa(location))}`, true);
            req.send();
        }

        btn.disabled = false;

        //formatName.innerHTML = `Saved to: ${location}`
        if(!card.querySelector(`#eta`).classList.contains(`d-none`)) card.querySelector(`#eta`).classList.add(`d-none`);
        if(!card.querySelector(`#speed`).classList.contains(`d-none`)) card.querySelector(`#speed`).classList.add(`d-none`);
    };

    return { update, complete }
}