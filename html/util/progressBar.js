const addProgressBar = (node, width, height, {
    align=`left`,
    usePercentText=false,
} = {}) => {
    let animeFunc = (typeof rawAnimeFunc == `function` ? rawAnimeFunc : anime)

    const dotSize = height || `15px`;

    const bar = document.createElement(`div`);
    bar.id = `progressBar`;
    bar.style.width = width || `100%`;
    bar.style.height = dotSize;

    bar.classList.add(`d-flex`);
    bar.classList.add(`flex-column`);

    bar.style.marginTop = `5px`;

    bar.style.background = `rgba(50, 50, 50, 0.35)`;
    bar.style.borderRadius = `100px`;

    const fill = document.createElement(`div`);
    fill.id = `progressFill`;
    fill.style.position = `relative`;
    fill.style.width = dotSize;
    fill.style.minWidth = dotSize;
    fill.style.height = dotSize;

    fill.classList.add(`d-flex`);
    fill.classList.add(`justify-content-center`);
    fill.classList.add(`align-items-center`);

    fill.style.background = `rgba(255, 255, 255, 0.75)`;
    fill.style.borderRadius = `100px`;
    fill.style.paddingLeft = `4px`;
    fill.style.paddingRight = `4px`;

    bar.appendChild(fill);

    const fillText = document.createElement(`p`);
    fillText.id = `progressText`;

    fillText.style.marginLeft = `5px`;
    fillText.style.marginRight = `5px`;
    fillText.style.padding = `0px`;
    fillText.style.fontSize = `0.65rem`;

    fillText.style.width = bar.style.width;
    fillText.style.textAlign = align || `center`;

    fillText.style.color = `rgb(0, 0, 0)`;

    fillText.style.position = `absolute`;
    fillText.style.pointerEvents = `none`;

    fillText.innerText = ``;

    bar.appendChild(fillText);

    let lastProgress = null;
    let lastMsg = ``;

    let allowProgressChanges = true;
        
    const startPendingAnimation = (first) => {
        if((lastProgress || lastMsg) && first) return retObj.setProgress();

        animeFunc.remove(fill)
        
        fill.style.width = dotSize;

        animeFunc({
            targets: fill,
            loop: true,
            duration: 1500,
            width: [`75%`, dotSize],
            left: [`0px`, `calc(100% - ${dotSize})`],
            opacity: [0.75, 0],
            easing: `easeOutCirc`,
        })
    }

    animeFunc({
        targets: bar,
        opacity: [0, 1],
        maxHeight: [0, dotSize],
        duration: 500,
        easing: `easeOutCirc`,
        begin: () => {
            node.appendChild(bar);
        
            startPendingAnimation(true);
        }
    });

    const retObj = {
        node,
        setProgress: (progress, txt) => {
            if(progress == lastProgress) progress = undefined;
            if(txt == lastMsg || usePercentText) txt = undefined;

            if(typeof progress == `undefined` && typeof txt == `undefined`) return;

            if(usePercentText) txt = `${progress}% complete`;

            console.log(`progbar: ${progress}% / ${txt}`)

            if(!allowProgressChanges) return;

            if(!bar.parentElement) node.appendChild(bar);

            if(txt && txt != lastMsg) {
                fillText.innerText = txt;
            } else {
                fillText.innerText = ``;
            }

            if(typeof progress == `number` && progress >= 0 && progress <= 100) {
                animeFunc.remove(fill);
                fill.style.opacity = 1;
                animeFunc({
                    targets: fill,
                    left: `0px`,
                    width: [lastProgress, `${progress}%`],
                    duration: 350,
                    easing: `easeOutCirc`,
                });
            } else if(typeof progress != `undefined` && lastProgress != progress) {
                startPendingAnimation();
            }

            lastProgress = typeof progress == `number` ? progress : lastProgress;
        },
        remove: () => {
            if(!allowProgressChanges) return;

            allowProgressChanges = false;

            animeFunc.remove(fill);
            
            animeFunc({
                targets: fill,
                left: `0px`,
                width: [lastProgress, `100%`],
                duration: 350,
                easing: `easeOutCirc`,
            });

            animeFunc({
                targets: bar,
                opacity: [1, 0],
                maxHeight: [dotSize, 0],
                duration: 500,
                easing: `easeOutCirc`,
                complete: () => {
                    if(bar.parentNode) bar.parentNode.removeChild(bar);
                    if(fill.parentNode) fill.parentNode.removeChild(fill);
                }
            });

            return true;
        }
    };

    return retObj
}