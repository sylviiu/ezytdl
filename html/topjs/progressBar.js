const addProgressBar = (node, width, height) => {
    const dotSize = height || `10px`;

    const bar = document.createElement(`div`);
    bar.id = `progressBar`;
    bar.style.width = width || `100%`;
    bar.style.height = dotSize;

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

    const fillText = document.createElement(`p`);
    fillText.id = `progressText`;

    fillText.style.margin = `0px`;
    fillText.style.padding = `0px`;
    fillText.style.fontSize = `0.6rem`;

    fillText.style.color = `rgb(0, 0, 0)`;

    fillText.innerText = ``;

    fill.appendChild(fillText);
        
    const startPendingAnimation = () => {
        anime.remove(fill)
        
        fill.style.width = dotSize;

        anime({
            targets: fill,
            loop: true,
            duration: 1500,
            width: [`75%`, dotSize],
            left: [`0px`, `calc(100% - ${dotSize})`],
            opacity: [0.75, 0],
            easing: `easeOutExpo`,
        })
    }

    anime({
        targets: bar,
        opacity: [0, 1],
        maxHeight: [0, dotSize],
        duration: 500,
        easing: `easeOutExpo`,
        begin: () => {
            node.appendChild(bar);
            bar.appendChild(fill);
        
            startPendingAnimation();
        }
    })

    return {
        setProgress: (progress, txt) => {
            // progress range: 0 -> 1

            if(typeof progress == `number` && progress) {
                console.log(`progress = number (${progress}) / ${txt || `(no text)`}`)

                anime.remove(fill);
                fill.style.opacity = 1;
                anime({
                    targets: fill,
                    left: `0px`,
                    width: `${progress}%`,
                    duration: 350,
                    easing: `easeOutExpo`,
                });

                if(txt) {
                    fillText.innerText = txt;
                } else {
                    fillText.innerText = ``;
                }
            } else {
                console.log(`progress = ${typeof progress} (not number)`)
                startPendingAnimation();
            }
        },
        remove: () => {
            anime.remove(fill);

            anime({
                targets: bar,
                opacity: [1, 0],
                maxHeight: [dotSize, 0],
                duration: 500,
                easing: `easeOutExpo`,
                complete: () => {
                    if(bar.parentNode) bar.parentNode.removeChild(bar);
                    if(fill.parentNode) fill.parentNode.removeChild(fill);
                }
            });

            return true;
        }
    };
}