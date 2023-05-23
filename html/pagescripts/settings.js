
const settingsCardMDConverter = new showdown.Converter({ parseImgDimensions: true });

document.getElementById(`settingsBox`).querySelector(`#options`).childNodes.forEach(node => node.classList.add(`d-none`));
const settingsBox = document.getElementById(`settingsBox`).cloneNode(true);
document.getElementById(`settingsBox`).parentNode.removeChild(document.getElementById(`settingsBox`));

const addFilenameFunctionality = () => {
    const fileNameInput = document.getElementById(`outputFilename`).querySelector(`#string`);
    document.getElementById(`fileNameOptions`).querySelectorAll(`.btn`).forEach((button) => button.onclick = () => {
        fileNameInput.value += `%(${button.id})s`;
        fileNameInput.focus();
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
            card.querySelector(`#string`).value = config[key];
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

configuration.get().then(newConf => {
    parse(newConf)
    addFilenameFunctionality(newConf)
});

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