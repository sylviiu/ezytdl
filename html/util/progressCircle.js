const svgns = `http://www.w3.org/2000/svg`;

const addProgressCircle = (node, width, showBackground, {
    color = `rgba(255, 255, 255, 0.75)`,
    overrideWidth = 0,
    overrideHeight = 0,
}={}) => {
    let animeFunc = (typeof rawAnimeFunc == `function` ? rawAnimeFunc : anime)

    const nodeSize = Math.floor(parseInt(overrideWidth) || node.getBoundingClientRect().width, parseInt(overrideHeight) || node.getBoundingClientRect().height);

    const dotSizeNum = parseInt(overrideWidth || overrideHeight ? (nodeSize/7) : (width || (nodeSize/7)));

    const dotSize = dotSizeNum + `px`;

    console.log(nodeSize, dotSize, dotSizeNum);

    const svg = document.createElementNS(svgns, `svg`);

    svg.style.width = nodeSize;
    svg.style.height = nodeSize;
    svg.style.transform = `rotate(-90deg)`;
    svg.style.position = `absolute`;
    svg.classList.add(`d-flex`);
    //svg.classList.add(`justify-content-center`);
    //svg.classList.add(`align-items-center`);
    svg.setAttribute(`viewBox`, `0 0 ${nodeSize} ${nodeSize}`);

    const circle = document.createElementNS(svgns, `circle`);

    circle.id = `progressCircleBG`

    circle.setAttribute(`cx`, (nodeSize / 2));
    circle.setAttribute(`cy`, (nodeSize / 2));
    circle.setAttribute(`r`, (nodeSize / 2)-(dotSizeNum / 2));
    circle.style.fill = `transparent`;
    circle.style.stroke = `rgba(255, 255, 255, ${showBackground ? `0.25` : `0`})`;
    circle.style.strokeWidth = dotSize;

    svg.appendChild(circle);

    const circleFG = document.createElementNS(svgns, `circle`);

    const fullCircle = Math.PI * 2 * ((nodeSize / 2)-(dotSizeNum / 2));

    circleFG.id = `progressCircleFG`

    circleFG.setAttribute(`cx`, (nodeSize / 2));
    circleFG.setAttribute(`cy`, (nodeSize / 2));
    circleFG.setAttribute(`r`, (nodeSize / 2)-(dotSizeNum / 2));
    circleFG.style.strokeDasharray = fullCircle;
    //circleFG.style.transform = `rotate(-90 25 25)`;
    circleFG.style.fill = `transparent`;
    circleFG.style.stroke = color || `rgba(255, 255, 255, 0.75)`;
    circleFG.style.strokeWidth = dotSize;
    circleFG.style.strokeLinecap = `round`;
    circleFG.style.strokeDashoffset = fullCircle;
    
    svg.appendChild(circleFG);

    // here's the functions :D

    let lastProgress = null;

    let allowProgressChanges = true;
        
    const startPendingAnimation = (first) => {
        if((lastProgress) && first) return retObj.setProgress();

        animeFunc({
            targets: circleFG,
            loop: true,
            duration: 1500,
            opacity: [1, 0],
            strokeDashoffset: [fullCircle, 0],
            easing: `easeOutCirc`,
        })
    }

    animeFunc({
        targets: [circle, circleFG],
        strokeWidth: [0, dotSize],
        opacity: [0, 1],
        duration: 500,
        easing: `easeOutCirc`,
        /*begin: () => {
            node.appendChild(svg);
            if(lastProgress) {
                retObj.setProgress(lastProgress);
            }
        }*/
        begin: () => {
            node.appendChild(svg);
        
            startPendingAnimation(true);
        }
    });

    const retObj = {
        node,
        setProgress: (progress) => {
            if(progress == lastProgress) progress = undefined;

            if(typeof progress == `undefined`) return;

            console.log(`progcirc: ${progress}%`)

            if(!allowProgressChanges) return;

            if(!svg.parentElement) node.appendChild(svg);

            if(typeof progress == `number` && progress >= 0 && progress <= 100) {
                animeFunc.remove(circleFG);
                circleFG.style.opacity = 1;
                animeFunc({
                    targets: circleFG,
                    strokeDashoffset: [fullCircle * lastProgress, fullCircle * (100 - (progress))/100],
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

            animeFunc.remove(circle)
            animeFunc.remove(circleFG)
            animeFunc.remove(svg)
            
            animeFunc({
                targets: [circle, circleFG],
                strokeWidth: [dotSize, 0],
                duration: 350,
                easing: `easeOutCirc`,
                complete: () => {
                    if(svg.parentNode) svg.parentNode.removeChild(svg);
                }
            });

            return true;
        }
    };

    return retObj
        
    /*const startPendingAnimation = (noClearAnim) => {
        if(!noClearAnim) animeFunc.remove(circle)
        if(!noClearAnim) animeFunc.remove(circleFG)
        if(!noClearAnim) animeFunc.remove(svg)

        animeFunc({
            targets: circleFG,
            loop: true,
            duration: 1500,
            opacity: [1, 0],
            strokeDashoffset: [fullCircle, 0],
            easing: `easeOutCirc`,
        })
    }

    let lastProgress = 1;

    animeFunc({
        targets: [circle, circleFG],
        strokeWidth: [0, dotSize],
        opacity: [0, 1],
        duration: 500,
        easing: `easeOutCirc`,
        begin: () => {
            node.appendChild(svg);
            if(lastProgress) {
                retObj.setProgress(lastProgress);
            }
        }
    });

    startPendingAnimation(true);

    let allowProgressChanges = true;

    const retObj = {
        node,
        setProgress: (progress) => {
            if(!allowProgressChanges) return;

            if(!svg.parentElement) node.appendChild(svg);

            if(progress < 0) progress = 0;

            if(progress > 100) progress = null;

            if(typeof progress == `number`) progress = (100 - (progress))/100

            console.log(`parsed new circle progress num`, progress)

            if(typeof progress == `number` && progress >= 0 && progress <= 1) {
                animeFunc.remove(circle)
                animeFunc.remove(circleFG)
                animeFunc.remove(svg)
                if(!svg.parentNode) node.appendChild(svg);
                circleFG.style.opacity = 1;
                circle.style.opacity = 1;
                circleFG.style.strokeWidth = dotSize;
                circle.style.strokeWidth = dotSize;
                animeFunc({
                    targets: circleFG,
                    strokeDashoffset: [fullCircle * lastProgress, fullCircle * progress],
                    duration: 350,
                    easing: `easeOutCirc`,
                });
            } else if(lastProgress != progress) {
                startPendingAnimation();
            }

            lastProgress = typeof progress == `number` ? progress : lastProgress;
        },
        remove: () => {
            if(!allowProgressChanges) return;

            allowProgressChanges = false;

            animeFunc.remove(circle)
            animeFunc.remove(circleFG)
            animeFunc.remove(svg)
            
            animeFunc({
                targets: [circle, circleFG],
                strokeWidth: [dotSize, 0],
                duration: 350,
                easing: `easeOutCirc`,
                complete: () => {
                    if(svg.parentNode) svg.parentNode.removeChild(svg);
                }
            });

            return true;
        }
    };

    return retObj;*/
}