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

if(window == useWindow) {
    const postChangeHook = () => {
        if(typeof useWindow.disableAnimations == `function`) {
            console.log(`Disabling animations (via useWindow)`)
            useWindow.disableAnimations()
        } else if(typeof disableAnimations == `function`) {
            console.log(`Disabling animations`)
            disableAnimations()
        } 
    }

    configuration.get().then(newConf => { 
        Object.assign(config, newConf);
        postChangeHook();
    });
    
    configuration.hook(newConf => {
        Object.assign(config, newConf);
        postChangeHook();
    });
}

var systemColors = parseSystemColors(system.colors());
console.log(`systemColors: `, systemColors)

var currentColorScheme = systemColors[0];

var appVersion = `0.0.0`;
version.get().then(v => appVersion = v);

var genericURLRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i;

var markdown = new showdown.Converter({ parseImgDimensions: true });