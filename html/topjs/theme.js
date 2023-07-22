var parseRules = (rules) => {
    let str = ``;

    for(const key of Object.keys(rules)) {
        let thisStr = ``;

        for(const key2 of Object.keys(rules[key])) {
            thisStr += `${key2}: ${rules[key][key2]}; `;
        };

        str += `${key} { ${thisStr} }\n`;
    };

    return str
}

var theme = (useLightMode) => {
    if(typeof currentColorScheme == `object`) {
        const lightMode = typeof useLightMode == `boolean` ? useLightMode : ((window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? false : true);

        usingLightMode = lightMode;

        const styleElement = document.getElementById(`themeStyle`) || document.createElement(`style`);

        styleElement.id = `themeStyle`;

        const { dark, darker, light, standard } = currentColorScheme;

        const parseRGB = ({r,g,b}, a) => `rgb${a ? `a` : ``}(${r},${g},${b}${a ? `,${a}` : ``})`;
        
        //`rgb(${colorScheme.light.r}, ${colorScheme.light.g}, ${colorScheme.light.b})`

        const newRules = {
            ".ez-navbar": {
                "background-color": `${lightMode ? `rgba(255,255,255,0.2)` : `rgba(0,0,0,0.5)`} !important`,
                "color": `${lightMode ? `rgb(0,0,0)` : `rgb(255,255,255)`} !important`,
            },
            ".ez-bg": {
                "background-color": lightMode ? `rgb(245,245,245)` : `rgb(10,10,10)`,
            },
            ".ez-default": {
                "background-color": `${lightMode ? `rgb(0,0,0,0.05)` : `rgb(255,255,255,0.05)`} !important`,
                "color": `${lightMode ? `rgb(0,0,0)` : `rgb(255,255,255)`} !important`,
            },
            ".ez-defaultg2": {
                "background-color": `${lightMode ? `rgb(0,0,0,0.035)` : `rgb(255,255,255,0.035)`} !important`,
                "color": `${lightMode ? `rgb(0,0,0)` : `rgb(255,255,255)`} !important`,
            },
            ".ez-defaultop": {
                "background-color": `${lightMode ? `rgb(235,235,235,0.25)` : `rgb(15,15,15,0.0.25)`} !important`,
                "color": `${lightMode ? `rgb(0,0,0)` : `rgb(255,255,255)`} !important`,
            },
            ".ez-default2": {
                //"background-color": `${lightMode ? `rgba(0,0,0,0.85)` : `rgb(255,255,255,0.85)`} !important`,
                "background-color": `${lightMode ? `rgb(255,255,255,0.85)` : `rgba(255,255,255,0.05)`} !important`,
                "color": `${lightMode ? `rgb(0,0,0)` : `rgb(255,255,255)`} !important`,
            },
            ".ez-selected": {
                "background-color": `${parseRGB(lightMode ? dark : light, 0.85)} !important`,
                "color": `${lightMode ? `rgb(255,255,255)` : `rgb(0,0,0)`} !important`,
            },
            ".ez-card": {
                "background-color": `${lightMode ? `rgba(255,255,255,0.25)` : `rgba(30,30,30,0.35)`} !important`,
            },
            ".ez-card2": {
                "background-color": `${lightMode ? `rgba(150,150,150,0.25)` : `rgba(45,45,45,0.35)`} !important`,
            },
            ".ez-ifc": {
                "color": `${lightMode ? `rgb(0,0,0)` : `rgb(255,255,255)`} !important`,
            },
            /*".ez-icon": {
                //"background-color": `${lightMode ? `rgb(0,0,0)` : `rgb(255,255,255)`} !important`,
                "background-color": `${lightMode ? `rgb(255,255,255)` : `rgb(0,0,0)`} !important`,
                "color": `${lightMode ? `rgb(0,0,0)` : `rgb(255,255,255)`} !important`,
            },*/
            ".ez-text": {
                "color": `${lightMode ? `rgba(0,0,0,0.85)` : `rgba(255,255,255,0.85)`} !important`,
            },
            "a": {
                "color": `${lightMode ? `rgba(0,0,0)` : `rgba(255,255,255)`} !important`,
            },
            ".ez-progressbg": {
                "background-color": `${lightMode ? `rgba(200, 200, 200, 0.35)` : `rgba(50, 50, 50, 0.35)`} !important`,
            }
        };

        styleElement.innerHTML = parseRules(newRules);

        console.log(`setting theme to ${lightMode ? `light` : `dark`}`, newRules)

        if(!document.getElementById(`themeStyle`)) document.head.appendChild(styleElement);

        for(const hook of themeHooks) hook({lightMode, colorScheme: currentColorScheme, newRules});
    }
};

if(typeof themeHooks == `undefined`) {
    themeHooks = [];
    themeHook = (cb) => themeHooks.push(cb);
    usingLightMode = false;
    configuration.hook(theme);
}

theme();