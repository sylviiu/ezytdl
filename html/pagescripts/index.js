let previousConfig = Object.assign({}, config || {});

const postConfigHooks = [];

const popoutButtons = createPopout({
    buttons: [
        {
            heading: `Settings`,
            element: document.getElementById(`settingsButton`),
            href: `settings.html`
        }
    ],
    navigateEvent: (e, href) => {
        console.log(`redirecting window to "${href}"`)
        e.preventDefault();
        window.location.href = href;
    },
    completeHook: () => {
        configuration.get().then(newConf => {
            if(JSON.stringify(previousConfig) != JSON.stringify(newConf)) {
                console.log(`config has changed!`);
        
                if(currentInfo) createNotification({
                    headingText: `Config updated!`,
                    bodyText: `The configuration has been updated. The changes will take effect next search / info retrieval.`,
                })
        
                config = newConf;
                previousConfig = Object.assign({}, newConf || {});
            } else {
                console.log(`config has NOT changed.`)
            }

            postConfigHooks.forEach(h => h(newConf));
        });
    }
});

update.event(m => {
    if(m && !m.complete) {
        popoutButtons.setCloseable(false);
    } else {
        popoutButtons.setCloseable(true);
    }
})

const _temporaryFormatCard = document.getElementById(`formatCard`).cloneNode(true);
document.body.appendChild(_temporaryFormatCard);
const formatCardComputed = window.getComputedStyle(_temporaryFormatCard);
const innerFormatCardStyle = _temporaryFormatCard.querySelector(`#innerFormatCard`).style;
document.body.removeChild(_temporaryFormatCard);
            
const { waves, setWavesColor } = generateWaves();

waves.style.opacity = 0;

document.body.insertBefore(waves, document.body.firstChild);

const wavesHeight = waves.getBoundingClientRect().height;

console.log(`wavesHeight`, wavesHeight)
            
waves.style.bottom = (wavesHeight * -1) + `px`;

const setBackgroundColor = (color) => {
    anime({
        targets: document.body,
        backgroundColor: `rgb(${color.darker.r}, ${color.darker.g}, ${color.darker.b})`,
        duration: 4000,
        easing: `easeOutExpo`
    });
}

let selectedTab = null;

const wavesOpt = {};

const waveAnims = {
    fadeIn: () => {
        anime.remove(waves)

        anime({
            targets: waves,
            opacity: 1,
            bottom: 0,
            duration: 4000,
            easing: `easeOutCirc`
        })

        document.body.style.overflowY = `hidden`;
    },
    fadeOut: () => {
        anime.remove(waves)

        anime({
            targets: waves,
            opacity: 0,
            bottom: wavesHeight/2 * -1,
            duration: 1000,
            easing: `easeOutCirc`
        })

        document.body.style.overflowY = `scroll`;
    }
}

const getWaveAnims = (tabName) => {
    wavesOpt[tabName] = true;

    return {
        fadeIn: () => {
            wavesOpt[tabName] = true;
            if(selectedTab == tabName) {
                console.log(`fading in waves for tab "${tabName}"`)
                waveAnims.fadeIn();
            } else console.log(`not fading in waves for tab "${tabName}" because it is not selected (current: ${selectedTab})`)
        },
        fadeOut: () => {
            wavesOpt[tabName] = false;
            if(selectedTab == tabName) {
                console.log(`fading out waves for tab "${tabName}"`)
                waveAnims.fadeOut();
            } else console.log(`not fading out waves for tab "${tabName}" because it is not selected (current: ${selectedTab})`)
        },
    }
};

const refreshWaves = () => {
    if(wavesOpt[selectedTab]) {
        waveAnims.fadeIn();
    } else {
        waveAnims.fadeOut();
    }
}

const searchBoxHeights = () => [`${window.innerHeight - 80}px`, `225px`]

const background = document.getElementById(`background`);

const listboxTemplate = document.getElementById(`listbox`).cloneNode(true);

while(listboxTemplate.querySelector(`#formatCard`)) listboxTemplate.querySelector(`#formatCard`).remove();

const formatListTemplate = document.getElementById(`formatList`).cloneNode(true);
            
const formatCard = document.getElementById(`formatCard`).cloneNode(true);

const formatCardBounds = document.getElementById(`formatCard`).getBoundingClientRect();

const everything = document.getElementById(`everythingContainer`);

const container = document.getElementById(`mainContainer`).cloneNode(true);

const backgrounds = {};

const setBackground = async (tab, url) => {
    if(!tab) tab = selectedTab;

    if(typeof url == `string`) backgrounds[tab] = url
    else if(url === false) backgrounds[tab] = null;

    if(selectedTab == tab) {
        anime.remove(background);

        const hide = (duration=1000) => new Promise(res => {
            anime({
                targets: background,
                opacity: 0,
                scale: 1.05,
                duration,
                easing: `easeOutExpo`,
                complete: () => {
                    res();
                    background.style.backgroundImage = ``;
                }
            });
        });

        if(tab && backgrounds[tab]) {
            if(background.style.opacity != 0) await hide(450);
            anime({
                targets: background,
                opacity: [0, 0.15],
                scale: [1, 1.15],
                duration: 4000,
                easing: `easeOutExpo`,
                begin: () => {
                    background.style.backgroundImage = `url(${backgrounds[tab]})`;
                }
            })
        } else hide();
    }
};

const tabButtons = document.getElementById(`tabButtons`);

const tabButton = document.getElementById(`tabButton`).cloneNode(true);
document.getElementById(`tabButton`).remove();

let selectTab = () => {};

let collapsed = false;

let tabStyle = {
    collapse: () => {
        collapsed = true;
        for(const { button } of Object.values(tabs)) {
            button.onmouseout();
        }
    },
    expand: () => {
        collapsed = false;
        for(const { button } of Object.values(tabs)) {
            button.onmouseover();
            button.onmouseout();
        }
    }
}

getTabs().then(async tabs => {
    const searchStr = window.location.search.slice(1);

    let lastUsedTab = searchStr ? `Download` : (await localStorage.getItem(`selectedTab`));

    console.log(`last used tab: ${lastUsedTab} (${searchStr ? `search string: ${searchStr}` : `no search string`})`);

    if(!tabs[lastUsedTab]) {
        console.log(`last used tab "${lastUsedTab}" does not exist!`);
        lastUsedTab = `Download`;
    }

    const tabKeys = Object.keys(tabs);
    
    let transitioning = false;
    
    const initializeTab = (tab, noCopy) => {
        if(!tab.content) {
            console.log(`initializing tab "${tab.name}"`)
            tab.content = noCopy ? document.getElementById(`mainContainer`) : container.cloneNode(true);

            const tabOpt = {
                setBackground: (url) => setBackground(tab.name, url),
                wavesAnims: getWaveAnims(tab.name),
                colorScheme: systemColors[tab.colorScheme],
            };

            console.log(tab, `options for tab "${tab.name}" -`, tabOpt)
    
            tab.initializePage(tab.content, tabOpt);
        }
    }
    
    selectTab = (tabName) => {
        const tab = tabs[tabName];
        const currentTab = selectedTab ? tabs[selectedTab] : null;
    
        const indexOfNew = tabKeys.indexOf(tabName);
        const indexOfCurrent = tabKeys.indexOf(selectedTab);
    
        (async () => {
            if(!transitioning && tab && selectedTab != tabName) {
                console.log(`selecting tab "${tabName}"`)

                transitioning = true;

                let previousSelectedTab = selectedTab;
    
                selectedTab = tabName;
    
                if(typeof tab.canSwitch == `function`) {
                    const result = await tab.canSwitch();
    
                    if(!result) {
                        console.log(`not selecting tab "${tabName}" because canSwitch returned false`)
                        transitioning = false;
                        if(!previousSelectedTab) {
                            selectedTab = null;
                            return selectTab(`Download`)
                        } else {
                            selectedTab = previousSelectedTab;
                            return false;
                        }
                    } else console.log(`selecting tab "${tabName}" - canSwitch returned true`)
                } else {
                    console.log(`selecting tab "${tabName}" - canSwitch is not a function`);
                }
    
                window.scroll({
                    top: 0,
                    behavior: `instant`
                })

                await localStorage.setItem(`selectedTab`, tabName);

                console.log(`selecting tab "${tabName}" - set storage key!`)
    
                const colorScheme = systemColors[tab.colorScheme];
    
                currentColorScheme = colorScheme
    
                setBackground(tabName);
    
                setBackgroundColor(colorScheme);
                setWavesColor(colorScheme.standard);
        
                initializeTab(tab);
    
                console.log(`new color scheme`, colorScheme);
                
                tab.button.style.background = `rgb(${colorScheme.light.r},${colorScheme.light.g},${colorScheme.light.b})`;
                tab.button.style.color = `rgb(0,0,0)`;
    
                if(tab.button.querySelector(`#icon`).classList.contains(`far`)) {
                    tab.button.querySelector(`#icon`).classList.remove(`far`);
                    tab.button.querySelector(`#icon`).classList.add(`fas`);
    
                    tab.button.onmouseover();
                };
        
                if(currentTab) {
                    currentTab.button.style.background = tabButton.style.background;
                    currentTab.button.style.color = tabButton.style.color;
    
                    currentTab.button.onmouseout();
    
                    if(currentTab.button.querySelector(`#icon`).classList.contains(`fas`)) {
                        currentTab.button.querySelector(`#icon`).classList.remove(`fas`);
                        currentTab.button.querySelector(`#icon`).classList.add(`far`);
                    };
                };
        
                if(!tab.content.parentElement) {
                    console.log(`appending tab "${tab.name}" to everything`)
        
                    const goingLeft = indexOfNew < indexOfCurrent;
        
                    tab.content.style.left = goingLeft ? `-100%` : `+100%`;
        
                    console.log(currentTab.content.style.left, tab.content.style.left)
        
                    everything.appendChild(tab.content);
        
                    refreshWaves();
        
                    anime.remove(tab.content);
                    anime.remove(currentTab.content);
        
                    anime({
                        targets: [tab.content, currentTab.content],
                        left: goingLeft ? `+=100%` : `-=100%`,
                        duration: 500,
                        easing: `easeOutExpo`,
                        complete: () => {
                            currentTab.content.remove();
                            transitioning = false;
                        }
                    });
                } else transitioning = false;
            } else console.log(`not selecting tab "${tabName}" because it is already selected or it does not exist`)
        })();

        return tab;
    };
    
    for(const tabName of tabKeys) {
        const tab = tabs[tabName];
    
        tab.name = tabName;
    
        if(tabName == lastUsedTab) initializeTab(tab, true);
    
        const thisID = `tab-${tabName}`
    
        const thisButton = tabButton.cloneNode(true);
    
        thisButton.id = thisID;
    
        thisButton.onclick = () => selectTab(tabName);
    
        const icon = thisButton.querySelector(`#icon`);
        const name = thisButton.querySelector(`#name`);

        thisButton.onmouseover = () => {
            anime.remove(name);
            anime({
                targets: name,
                opacity: 1,
                //letterSpacing: `0px`,
                fontSize: `1em`,
                paddingLeft: `6px`,
                duration: 200,
                easing: `easeOutCirc`,
                begin: () => {
                    if(name.classList.contains(`d-none`)) name.classList.remove(`d-none`)
                }
            })
        };

        thisButton.onmouseout = () => {
            if(selectedTab == tabName && !collapsed) return;
            anime.remove(name);
            anime({
                targets: name,
                opacity: 0,
                //letterSpacing: `-8px`,
                fontSize: `0em`,
                paddingLeft: `0px`,
                duration: 200,
                easing: `easeOutCirc`,
                complete: () => {
                    if(!name.classList.contains(`d-none`)) name.classList.add(`d-none`)
                }
            })
        };

        thisButton.onmouseout();
    
        icon.classList.remove(`fa-circle`);
        icon.classList.add(`fa-${tab.icon}`);
    
        name.innerText = tabName;
        
        if(!thisButton.parentElement) tabButtons.appendChild(thisButton);
    
        tab.button = thisButton;
    }
                
    setTimeout(() => {
        const tab = selectTab(lastUsedTab);

        getWaveAnims(lastUsedTab).fadeIn();

        if(searchStr) {
            const { content, processURL } = tab;
            history.pushState({ page: 1 }, "introAnimation", window.location.href.split(`?`)[0]);
            content.querySelector(`#urlInput`).value = searchStr;
            processURL();
        }
    }, 50);

    initDownloadManager(true);
})
        
const housekeeping = () => {
    updateChecker();
    changelog.check();
}

if(typeof introAnimation != `undefined`) {
    introAnimation.wait(() => housekeeping())
} else housekeeping();