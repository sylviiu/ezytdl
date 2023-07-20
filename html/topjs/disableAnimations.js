if(typeof rawAnimeFunc == `undefined`) {
    anime.suspendWhenDocumentHidden = false;

    rawAnimeFunc = anime;

    rawAnimeFunc._onDocumentVisibility = () => {
        console.log(`[ignored root] document visibility changed (${e})`)
    }
}

var disableAnimations = () => {
    if(typeof config == `object` && config.disableAnimations) {
        console.log(`Disabling animations (crudely)`)
    
        anime = (obj) => {
            /*const parseTargetStyle = (target) => {
                if(target && target.style) {
                    const computedStyle = window.getComputedStyle(target);
                    for(const key of Object.keys(obj)) {
                        if(typeof computedStyle[key] != `undefined`) {
                            console.log(key, obj[key])

                            if(typeof obj[key] == `object` && typeof obj[key].length == `number`) {
                                target.style[key] = `${obj[key].slice(-1)[0]}`;
                            } else {
                                target.style[key] = `${obj[key]}`;
                            };

                            //delete obj[key];
                        }
                    }
                }
            }

            if(obj.targets && obj.targets.forEach) {
                obj.targets.forEach(parseTargetStyle)
            } else parseTargetStyle(obj.targets || obj.target)*/

            return rawAnimeFunc(Object.assign(obj, { 
                easing: `linear`,
                duration: 0,
                delay: 0,
            }))
        };
        
        Object.assign(anime, rawAnimeFunc)
    
        //anime.remove = () => null;
    } else {
        console.log(`Keeping animations (config: ${typeof config})`);

        anime = rawAnimeFunc;

        //anime.remove = (...args) => rawAnimeFunc.remove(...args);
    }
}

disableAnimations();

configuration.hook(disableAnimations);