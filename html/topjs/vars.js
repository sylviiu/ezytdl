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
console.log(`systemColors: `, systemColors)

var currentColorScheme = systemColors[0];

var appVersion = `0.0.0`;
version.get().then(v => appVersion = v);

var genericURLRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i;

var markdown = new showdown.Converter({ parseImgDimensions: true });

var postChangeHook = () => {
    if(typeof theme == `function`) {
        console.log(`Updating theme`)
        theme()
    };

    if(typeof useWindow.disableAnimations == `function`) {
        console.log(`Disabling animations (via useWindow)`)
        useWindow.disableAnimations()
    } else if(typeof disableAnimations == `function`) {
        console.log(`Disabling animations`)
        disableAnimations()
    };
}

if(window == useWindow) {
    configuration.get().then(newConf => { 
        Object.assign(config, newConf);
        postChangeHook();
    });
} else if(typeof config != `undefined`) postChangeHook();

configuration.hook(newConf => {
    Object.assign(config, newConf);
    postChangeHook();
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => typeof theme == `function` ? theme() : null);