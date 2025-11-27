var useDocument = document;

var useWindow = window;

while(window.parent && window.parent != useWindow) {
    useWindow = window.parent;
    useDocument = useWindow.document;
}

if(typeof config == `undefined`) {
    if(window.config) {
        config = window.config;
    } else if(typeof useWindow != `undefined` && useWindow.config) {
        config = useWindow.config;
    } else {
        config = {};
    }
}

var systemColors = parseSystemColors(system.colors());
console.log(`systemColors: `, systemColors);

var currentColorScheme = systemColors[0];

var appVersion = `0.0.0`;
version.get().then(v => appVersion = v);

var genericURLRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i;

var markdown = new showdown.Converter({ parseImgDimensions: true });

var postChangeHook = (newConf) => {
    if(typeof theme == `function`) {
        console.log(`Updating theme`)
        theme()
    };

    if(typeof useWindow.disableAnimations == `function`) {
        console.log(`Disabling animations (via useWindow)`)
        useWindow.disableAnimations(newConf)
    } else if(typeof disableAnimations == `function`) {
        console.log(`Disabling animations`)
        disableAnimations(newConf)
    };
}

if(window == useWindow) {
    configuration.get().then(newConf => { 
        Object.assign(config, newConf);
        postChangeHook();

        if(typeof window.rawAnimeFunc == `undefined`) {
            anime.suspendWhenDocumentHidden = false;
        
            window.rawAnimeFunc = anime;
        
            window.rawAnimeFunc._onDocumentVisibility = () => {
                console.log(`[ignored root] document visibility changed (${e})`)
            }
        }

        var disableAnimations = (useConf) => {
            if((useConf || typeof config == `object` ? config : {}).animations.disableAnimations) {
                console.log(`Disabling animations (crudely)`)
            
                window.anime = (obj) => {
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
        
                    return window.rawAnimeFunc(Object.assign(obj, { 
                        easing: `linear`,
                        duration: 0,
                        delay: 0,
                    }))
                };
                
                Object.assign(anime, window.rawAnimeFunc)
            
                //anime.remove = () => null;
            } else {
                console.log(`Keeping animations (config: ${typeof config})`);
        
                window.anime = window.rawAnimeFunc;
        
                //anime.remove = (...args) => rawAnimeFunc.remove(...args);
            }
        }
        
        disableAnimations(newConf);
        
        configuration.hook(disableAnimations);
    });
} else {
    Object.assign(window, {
        get anime() {
            return useWindow.anime;
        },
        set anime(newAnime) {
            return useWindow.anime = newAnime;
        },
        get rawAnimeFunc() {
            return useWindow.rawAnimeFunc;
        },
        set rawAnimeFunc(newAnime) {
            return useWindow.rawAnimeFunc = newAnime;
        },
    })
    if(typeof config != `undefined`) postChangeHook(config);
}

useWindow.configuration.hook(newConf => {
    Object.assign(config, newConf);
    postChangeHook(newConf);
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => typeof theme == `function` ? theme() : null);