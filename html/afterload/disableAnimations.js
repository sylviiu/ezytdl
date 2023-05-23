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
        }
    
        anime.remove = () => null;
    } else {
        console.log(`Keeping animations`);

        anime = rawAnimeFunc
    }
}

configuration.hook(disableAnimations);

disableAnimations(config)