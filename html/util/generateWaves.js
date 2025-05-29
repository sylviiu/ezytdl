const generateWaves = (color) => {
    if(!color) {
        console.log(`no color provided, using standard system colors`, systemColors)
        color = currentColorScheme.standard;
    };

    const { r, g, b } = color;

    const parentDiv = document.createElement(`div`);
    parentDiv.classList.add(`d-flex`);
    parentDiv.classList.add(`justify-content-center`)
    parentDiv.classList.add(`align-items-end`)
    parentDiv.style.zIndex = `-50`;
    parentDiv.style.width = `100vw`;
    parentDiv.style.position = `fixed`;
    parentDiv.style.pointerEvents = `none`;
    parentDiv.style.bottom = `0`;
    parentDiv.style.left = `0`;

    const nestedDiv = document.createElement(`div`);
    parentDiv.appendChild(nestedDiv);

    const svg = document.createElementNS(`http://www.w3.org/2000/svg`, `svg`);

    svg.setAttributeNS(null, `viewBox`, `0 24 150 28`);
    svg.setAttributeNS(null, `preserveAspectRatio`, `none`);
    svg.setAttributeNS(null, `shape-rendering`, `auto`);
    svg.setAttributeNS(null, `speed`, `1`);

    svg.style.position = `relative`;
    svg.style.width = `100vw`;
    svg.style.height = `15vh`;
    svg.style.marginBottom = `-7px`;
    svg.style.minHeight = `100px`;
    svg.style.maxHeight = `150px`;

    nestedDiv.appendChild(svg);

    const defs = document.createElementNS(`http://www.w3.org/2000/svg`, `defs`);
    svg.appendChild(defs);

    const path = document.createElementNS(`http://www.w3.org/2000/svg`, `path`);
    path.id = `gentle-wave`;
    path.setAttribute(`d`, `M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z`);
    defs.appendChild(path);

    const gnode = document.createElementNS(`http://www.w3.org/2000/svg`, `g`);

    const appendUse = (num, x, y, alpha) => {
        const use = document.createElementNS(`http://www.w3.org/2000/svg`, `use`);

        use.setAttributeNS(`http://www.w3.org/1999/xlink`, `xlink:href`, `#gentle-wave`);
        use.setAttributeNS(null, `x`, x);
        use.setAttributeNS(null, `y`, y);
        use.setAttributeNS(null, `fill`, `rgba(${r}, ${g}, ${b}, ${alpha})`);
        
        const diff = (1 + ((num+1)/10));
        const dur = Math.pow(7, diff);
        const delay = Math.random() * dur * -1;
        use.style.animation = `linear infinite normal none running move-forever`;
        use.style.animationDelay = `${delay}s`;
        use.style.animationDuration = `${dur}s`;

        gnode.appendChild(use);
        return use;
    };

    const useArray = [ appendUse(1, 48, 0, 0.7), appendUse(2, 48, 3, 0.5), appendUse(3, 48, 5, 0.3), appendUse(4, 48, 7, 1) ];

    svg.appendChild(gnode);

    const mappedWaveAnims = useArray.map((use) => {
        let animations = use.getAnimations();

        return {
            use, animations,
            get speed() {
                if(!animations.length) animations = use.getAnimations();
                return animations.find(o => typeof o.playbackRate == `number`)?.playbackRate;
            },
            set speed(speed=1) {
                if(!animations.length) animations = use.getAnimations();
                animations.forEach((anim) => anim.playbackRate = speed);
            }
        };
    });

    const timeline = {
        get speed() {
            console.log(mappedWaveAnims)
            return mappedWaveAnims[0].speed;
        },
        set speed(speed=1) {
            mappedWaveAnims.forEach((anim) => anim.speed = speed);
        },
        anim: null,
        setSpeed: (speed=1, {
            duration = 1350,
            easing = `easeOutCirc`
        }={}) => {
            if(timeline.anim) {
                timeline.anim.pause();
                delete timeline.anim;
            }

            const easingFunc = anime.easing(easing) || anime.easing(`easeInOutCirc`);

            const initial = timeline.speed;
            const difference = speed - initial;

            timeline.anim = anime({
                duration: Number(duration) || 1350,
                update: (anim) => {
                    timeline.speed = initial + (easingFunc(anim.progress/100) * difference);
                    console.log(initial, speed, timeline.speed)
                },
                complete: () => {
                    delete timeline.anim;
                    timeline.speed = speed;
                },
            });

            return timeline.anim;
        }
    }

    const obj = {
        waves: parentDiv,
        useArray,
        setWavesColor: (color) => {
            for(const use of useArray) {
                const previousColor = use.getAttributeNS(null, `fill`);
                anime({
                    targets: use,
                    fill: `rgba(${color.r}, ${color.g}, ${color.b}, ${previousColor.split(`,`)[3].split(`)`)[0]})`,
                    duration: 1000,
                    easing: `easeOutExpo`,
                });
            }
        },
        timeline,
        pauseWaves: (duration=1250) => {
            if(duration == 0 || config.animations.disableAnimations) {
                timeline.speed = 0;
            } else timeline.setSpeed(0, { duration, easing: `linear` });
        },
        resumeWaves: (duration=1250) => {
            if(duration == 0 || config.animations.disableAnimations) {
                timeline.speed = 1;
            } else timeline.setSpeed(1, { duration, easing: `easeOutCirc` });
        }
    };

    return obj;
}