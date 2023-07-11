const rawAnimeFunc = anime;

const disableAnimations = () => {
    if(config.disableAnimations) {
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

            rawAnimeFunc(Object.assign(obj, { 
                duration: 0
            }))
        };
        
        Object.assign(anime, rawAnimeFunc)
    
        //anime.remove = () => null;
    } else {
        console.log(`Keeping animations`);

        anime = (...opts) => {
            const func = rawAnimeFunc(...opts);

            func._onDocumentVisibility = (e) => {
                // this is necessary because background throttling is disabled in window creation; there's no point in keeping this default
                console.log(`[ignored] document visibility changed (${e})`)
            };

            return func;
        };
        
        Object.assign(anime, rawAnimeFunc);

        //anime.remove = (...args) => rawAnimeFunc.remove(...args);
    }
}

configuration.hook(disableAnimations);

disableAnimations(config)