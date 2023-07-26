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

var theme = ({
    from=`auto`
}={}) => {
    let lightMode = false;

    if(typeof config == `object`) switch(config.theme) {
        case `dark`:
            lightMode = false;
            break;
        case `light`:
            lightMode = true;
            break;
        default:
            lightMode = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)') && window.matchMedia('(prefers-color-scheme: dark)').matches) ? false : true;
            break;
    };

    if(from == `auto` && usingLightMode == lightMode) return;

    usingLightMode = lightMode;

    const styleElement = document.getElementById(`themeStyle`) || document.createElement(`style`);

    styleElement.id = `themeStyle`;

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
        "a": {
            "color": `${lightMode ? `rgba(0,0,0)` : `rgba(255,255,255)`} !important`,
        },
        ".ez-progressbg": {
            "background-color": `${lightMode ? `rgba(200, 200, 200, 0.35)` : `rgba(50, 50, 50, 0.35)`} !important`,
        },
        ".ez-text": {
            "color": `${lightMode ? `rgba(0,0,0,0.85)` : `rgba(255,255,255,0.85)`} !important`,
        },
    };

    const currentColor = typeof currentColorScheme == `object` ? currentColorScheme : ((typeof systemColors == `object` ? systemColors : [])[0]);

    if(currentColor) {
        const current = lightMode ? `dark` : `light`

        const applyColorScheme = (className, colorScheme) => {
            for(const type of [``, `-light`, `-dark`]) {
                newRules[`${className}` + type] = {
                    "background-color": `${parseRGB(colorScheme[type.slice(1) || current])} !important`,
                    "color": `${(type.slice(1) || current) == `light` ? `rgb(0,0,0)` : `rgb(255,255,255)`} !important`,
                }
            }
        }

        applyColorScheme(`.ez-selected`, currentColor);

        if(typeof systemColors == `object` && typeof tabs == `object`) {
            for(const [ tab, { colorScheme } ] of Object.entries(tabs)) {
                const tabColor = systemColors[colorScheme];
                if(tabColor) applyColorScheme(`.ez-selected-${tab}`, tabColor);
            }
        };
    };

    for(const key of Object.keys(newRules).filter(k => k.startsWith(`.ez-`) && newRules[k]['background-color'])) {
        newRules[key + `-text`] = {
            "color": newRules[key]['background-color']
        }
    };

    const parsedNewRules = parseRules(newRules);

    if(styleElement.innerHTML != parsedNewRules) {
        styleElement.innerHTML = parseRules(newRules);
    
        console.log(`setting theme to ${lightMode ? `light` : `dark`}`, newRules)
    
        if(!document.getElementById(`themeStyle`)) document.head.appendChild(styleElement);
    
        for(const hook of themeHooks) hook({lightMode, colorScheme: currentColor, newRules});
    } else {
        console.log(`setting theme to ${lightMode ? `light` : `dark`}, except not really because it's already equivalent`)
    }
};

if(typeof themeHooks == `undefined`) {
    themeHooks = [];
    themeHook = (cb) => themeHooks.push(cb);
    usingLightMode = null;
    configuration.hook(theme);
}

theme();