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
            if(obj.complete) {
                obj.complete();
                obj.complete = undefined;
            }
    
            //return rawAnimeFunc(Object.assign({}, obj, { duration: 0 }))

            const parseTargetStyle = (target) => {
                if(target && target.style) {
                    const computedStyle = window.getComputedStyle(target);
                    for(const key of Object.keys(obj)) {
                        if(typeof computedStyle[key] != `undefined`) target.style[key] = obj[key];
                    }
                }
            }

            if(obj.targets && obj.targets.forEach) {
                obj.targets.forEach(parseTargetStyle)
            } else parseTargetStyle(obj.targets || obj.target)

            return rawAnimeFunc(Object.assign(obj, { 
                duration: 0
            }))
        };
        
        Object.assign(anime, rawAnimeFunc)
    
        //anime.remove = () => null;
    } else {
        console.log(`Keeping animations`);

        anime = rawAnimeFunc;

        //anime.remove = (...args) => rawAnimeFunc.remove(...args);
    }
}

configuration.hook(disableAnimations);

disableAnimations()