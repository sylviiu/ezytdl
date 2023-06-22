const settingsCardMDConverter = new showdown.Converter({ parseImgDimensions: true });

const cards = [];

const detailsStr = document.getElementById(`detailsStr`)

document.getElementById(`settingsBox`).querySelector(`#options`).childNodes.forEach(node => node.classList.add(`d-none`));
const settingsBox = document.getElementById(`settingsBox`).cloneNode(true);
document.getElementById(`settingsBox`).parentNode.removeChild(document.getElementById(`settingsBox`));

const addFilenameFunctionality = () => {
    const fileNameInput = document.getElementById(`outputFilename`).querySelector(`#string`);

    document.getElementById(`fileNameOptions`).querySelectorAll(`.btn`).forEach((button) => {
        const str = `%(${button.id.replace(/-/g, `,`)})s`;

        const dropHook = (first) => {
            if(fileNameInput.value.includes(str) && button.style.opacity != `0.35`) {
                //button.style.opacity = `0.35`;
                button.setAttribute(`draggable`, `false`)

                //anime.remove(button);
                anime({
                    targets: button,
                    scale: button.style.opacity == 0 ? [0, 0.85] : 0.85,
                    opacity: 0.35,
                    left: 0,
                    bottom: 0,
                    duration: first ? 0 : 500,
                    easing: `easeOutExpo`
                });
            } else if(!fileNameInput.value.includes(str) && button.style.opacity != `1`) {
                //button.style.opacity = `1`;
                button.setAttribute(`draggable`, `true`)

                //anime.remove(button);
                anime({
                    targets: button,
                    scale: button.style.opacity == 0 ? [0, 1] : 1,
                    opacity: 1,
                    left: 0,
                    bottom: 0,
                    duration: first ? 0 : 500,
                    easing: `easeOutExpo`
                });
            }
        };

        dropHook(true);

        fileNameInput.addEventListener(`input`, () => {
            dropHook();
        });

        const onclick = () => {
            if(fileNameInput.value.includes(str)) {
                fileNameInput.value = fileNameInput.value.replace(str, ``);
            } else {
                fileNameInput.value += str;
            };

            dropHook();
            fileNameInput.focus();
        }; button.onclick = onclick;

        new Draggable({
            node: button,
            targets: [fileNameInput],
            value: str,
            enableDrag: fileNameInput.value.includes(str) ? false : true,
            reanimate: false,
            dropHook
        });
    })
}

const createCard = (key, string, description, config, parentNode, showSaveButton, depth) => {
    console.log(key, string);

    if(!parentNode.querySelector(`#` + key)) {
        const newCard = settingsBox.cloneNode(true);
        newCard.id = key;

        if(!showSaveButton) {
            parentNode.style.background = `rgb(` + `${28 - ( depth+1 * 7 )}, `.repeat(3) + `)`
            newCard.style.background = `rgb(` + `${28 - ( depth+1 * 7 )}, `.repeat(3) + `)`

            newCard.querySelector(`#options`).childNodes.forEach(node => {
                node.style.removeProperty(`border-bottom-right-radius`)
                node.style.removeProperty(`border-top-right-radius`)
                if(node.id != `boolean`) node.style.background = `rgb(` + `${28 - ( depth+1 * 7 )}, `.repeat(3) + `)`
            });

            newCard.querySelector(`#name`).style.removeProperty(`min-width`);
            newCard.querySelector(`#name`).style.marginRight = `16px`;

            newCard.style.padding = `0px`
            newCard.style.margin = `0px`
            newCard.style.marginTop = `0px`
            newCard.style.minHeight = `0px`
            newCard.style.width = `100%`
        }

        parentNode.appendChild(newCard)
    } else console.log(`already present`);

    const card = document.getElementById(key)

    cards.push(card);

    card.querySelector(`#name`).innerHTML = settingsCardMDConverter.makeHtml(string);

    if(description) {
        card.querySelector(`#description`).innerHTML = settingsCardMDConverter.makeHtml(description);
        if(card.querySelector(`#description`).classList.contains(`d-none`)) card.querySelector(`#description`).classList.remove(`d-none`);
        card.querySelector(`#description`).style.marginBottom = `-10px`;
    } else {
        if(!card.querySelector(`#description`).classList.contains(`d-none`)) card.querySelector(`#description`).classList.add(`d-none`);
    }

    console.log(`type: ${typeof config[key]}`)

    if(typeof config[key] == `object`) {
        const opt = card.querySelector(`#options`);

        opt.classList.add(`flex-column`);

        for(e of Object.entries(config[key])) {
            createCard(e[0], e[0][0].toUpperCase() + e[0].slice(1), null, { strings: config.strings[key], [e[0]]: e[1] }, card.querySelector(`#options`), false, depth+1)
        };

        const height = opt.getBoundingClientRect().height;

        console.log(height)

        card.querySelector(`#save`).style.height = height + `px`;

        const getObject = (optionsObj) => {
            const obj = {};

            optionsObj.childNodes.forEach(child => {
                if(child.id && child.id != `save` && !child.classList.contains(`d-none`)) {
                    let id = typeof config[key][child.id];
                    
                    console.log(optionsObj.parentNode.id + ` > ` + optionsObj.id + ` > ` + child.id + `: ` + id)

                    if(id == `object`) {
                        obj[child.id] = getObject(child.querySelector(`#options`));
                    } else {
                        obj[child.id] = child.querySelector(`#${id}`).value;
                    }
                }
            });

            console.log(`obj of ${card.id}:`, obj)

            return obj;
        };
        
        card.querySelector(`#save`).onclick = () => updateConfig({ [key]: getObject(opt) });
    } else {
        if(card.querySelector(`#${typeof config[key]}`).classList.contains(`d-none`)) card.querySelector(`#${typeof config[key]}`).classList.remove(`d-none`);

        if(typeof config[key] == `string`) {
            const elm = card.querySelector(`#string`);
            elm.ondrop = (e) => e.preventDefault();
            elm.value = config[key];

            console.log(parentNode)

            if(elm.getAttribute(`savekey`) != `true`) {
                elm.setAttribute(`savekey`, `true`);
                elm.addEventListener(`keyup`, (e) => {
                    if(((e.ctrlKey && e.key == `s`) || (e.key == `Enter` || e.keyCode == 13)) && (card.querySelector(`#save`) || card.parentElement.parentElement.querySelector(`#save`))) {
                        (card.querySelector(`#save`) || card.parentElement.parentElement.querySelector(`#save`)).onclick();
                    }
                });
            }
        } else if(typeof config[key] == `boolean`) {
            let btn = card.querySelector(`#boolean`);

            const disabledBG = `rgb(255,145,145)`

            const setFalse = () => {
                btn.value = `false`;
                btn.innerHTML = `Disabled`;
                btn.style.background = disabledBG
            };

            const setTrue = () => {
                btn.value = `true`;
                btn.innerHTML = `Enabled`;
                btn.style.background = `#FFFFFF`
            };

            let updateBtn = () => {
                if(btn.value == `false`) {
                    setTrue()
                } else {
                    setFalse()
                }
            };

            if(config[key] == true) {
                setTrue()
            } else {
                setFalse()
            }

            card.querySelector(`#boolean`).onclick = () => updateBtn()
        } else if(typeof config[key] == `number`) {
            card.querySelector(`#number`).value = config[key];
            if(key == `concurrentDownloads`) {
                card.querySelector(`#number`).min = `1`;
                card.querySelector(`#number`).max = `1`;
            }
        }

        if(showSaveButton) {
            card.querySelector(`#save`).onclick = () => updateConfig({ [key]: card.querySelector(`#${typeof config[key]}`).value });
        } else if(card.querySelector(`#save`)) {
            card.querySelector(`#save`).parentNode.removeChild(card.querySelector(`#save`))
        }
    }

    parentNode.appendChild(card);
}

const createCards = (config) => {
    const strings = config.strings;
    const descriptions = config.descriptions;

    for (entry of Object.entries(strings)) createCard(entry[0], entry[1], descriptions[entry[0]], config, document.getElementById(`settingsList`), true, 0)

    if(detailsStr) document.getElementById(`settingsList`).appendChild(detailsStr)
}

const toggleButtons = (enable) => {
    if(!enable) {
        document.querySelectorAll(`button`).forEach((button) => {
            button.disabled = true;
        })
    } else {
        document.querySelectorAll(`button`).forEach((button) => {
            button.disabled = false;
        })
    }
}

const parse = (config) => {
    toggleButtons(true)
    createCards(config)
}

const updateConfig = (json) => {
    let req = new XMLHttpRequest();
    toggleButtons(false)
    configuration.set(json).then(newConf => {
        parse(newConf)
        addFilenameFunctionality(newConf)
        createNotification({
            headingText: `Settings updated.`,
            bodyText: `Your settings were saved successfully.`,
        });
    })
}

let paltform = navigator.platform.toLowerCase();

if(paltform.toLowerCase() != `win32` && !paltform.toLowerCase().includes(`linux`)) {
    const ffmpegCard = document.getElementById(`ffmpeg`);
    
    ffmpegCard.style.background = ffmpegCard.style.background.replace(`rgb(`, `rgba(`).replace(`)`, `, 0.5)`);
    ffmpegCard.querySelectorAll(`.btn`).forEach(btn => {
        btn.disabled = true;
        btn.style.background = btn.style.background.replace(`rgb(`, `rgba(`).replace(`)`, `, 0.5)`);
    });
    ffmpegCard.querySelector(`#ffmpegDownloadTxt`).innerHTML = `FFmpeg downloading is not available on your platform.<br>If FFmpeg is installed system-wide, ezytdl will use that.`
}

if(detailsStr) system.detailsStr().then(details => {
    const detailsStrConverter = new showdown.Converter({ parseImgDimensions: true });
    detailsStr.innerHTML = detailsStrConverter.makeHtml(details.join(`\n`) + `\n`);
    detailsStr.classList.remove(`d-none`)
})

configuration.get().then(newConf => {
    parse(newConf)
    addFilenameFunctionality(newConf)
    if(document.getElementById(`settingsList`).style.opacity == 0) {
        console.log(`Staggering cards: ${cards.map(c => c.id).join(`, `)}`)
        //cards.forEach(c => c.style.scale = 0);
        anime({
            targets: `.settingsBox`,
            delay: anime.stagger(15, {start: 10}),
            scale: [0, 1],
            opacity: [0, 1],
            duration: anime.stagger(150, {start: 600, easing: 'easeInExpo'}),
            easing: `easeOutExpo`,
            begin: () => {
                document.getElementById(`settingsList`).style.opacity = 1;
            }
        })
    }
});