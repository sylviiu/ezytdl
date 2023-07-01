const settingsCardMDConverter = new showdown.Converter({ parseImgDimensions: true });

const systemConfiguration = typeof parentWindow != `undefined` ? parentWindow.configuration : configuration

const cards = [];

const bottomContent = document.getElementById(`bottomContent`);

const detailsStr = document.getElementById(`detailsStr`);

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
            enableClickRecognition: false,
            dropHook
        });
    })
}

const createCard = (key, string, description, config, parentNode, showSaveButton, depth) => {
    console.log(`key`, key, `name / string`, string, `config / strings`, config && config.strings ? config.strings : null, `config / descriptions`, config && config.descriptions ? config.descriptions : null);

    if(key.endsWith(`Extended`)) return;

    if(!parentNode.querySelector(`#${key}`)) {
        const newCard = settingsBox.cloneNode(true);
        newCard.id = key;

        if(!showSaveButton) {
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

            newCard.style.backgroundColor = `rgba(0,0,0,0)`
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
        if(!showSaveButton) {
            card.querySelector(`#description`).style.fontSize = `0.8em`;
            card.querySelector(`#name`).style.marginBottom = `-15px`
        }
    } else {
        if(!card.querySelector(`#description`).classList.contains(`d-none`)) card.querySelector(`#description`).classList.add(`d-none`);
    }

    if(config.actions[key]) {
        if(!card.querySelector(`#action`).innerHTML.includes(config.actions[key].name)) card.querySelector(`#action`).innerHTML += config.actions[key].name;
        if(!config.actions[key].manuallySavable && !card.querySelector(`#save`).classList.contains(`d-none`)) card.querySelector(`#save`).classList.add(`d-none`)
        if(card.querySelector(`#action`).classList.contains(`d-none`)) {
            card.querySelector(`#action`).classList.remove(`d-none`);

            let progbar = null;

            systemConfiguration.actionUpdate(key, (_e, {progress, message, complete}) => {
                console.log(`actionUpdate: ${message} - ${progress} / ${complete}`)
                if(progress) {
                    if(!progbar) progbar = addProgressBar(card.querySelector(`#strings`), null, null, { align: `left` });
                    progbar.setProgress(progress, message);
                } else if(complete && progbar) {
                    progbar.remove();
                }
            });
        }
        card.querySelector(`#action`).onclick = () => {
            toggleButtons(false);

            const run = () => systemConfiguration.action({key, config, args: config.actions[key].args}).then(newConfig => {
                updateConfig(newConfig, { noUpdate: true, silent: true });
            });

            console.log(`key: ${key} -- clicked; confirm? ${config.actions[key].confirmation ? true : false}`)

            if(config.actions[key].confirmation) {
                dialog.create({
                    title: config.actions[key].name,
                    body: config.actions[key].confirmation + `\n\nAre you sure you want to continue?`,
                    buttons: [
                        {
                            text: `Yes`,
                            id: `yes`,
                            icon: `check`
                        },
                        {
                            text: `No`,
                            id: `no`,
                            primary: true,
                            icon: `cross`
                        }
                    ]
                }).then(({ response }) => {
                    if(response == `yes`) {
                        run();
                    } else {
                        toggleButtons(true);
                    }
                })
            } else run();
        }
    }

    console.log(`type: ${typeof config[key]}`)

    if(typeof config[key] == `object`) {
        //card.querySelector(`#strings`).style.width = `33%`;
        card.querySelector(`#strings`).style.maxWidth = `33%`;

        const disableInputs = config.disableInputs || (config.actions[key] && !config.actions[key].manuallySavable ? true : false);

        const opt = card.querySelector(`#options`);
        opt.classList.add(`flex-column`);

        if(!card.querySelector(`#optHolder`)) {
            const newOptHolder = card.querySelector(`#options`).cloneNode(true);
            newOptHolder.id = `optHolder`
    
            opt.replaceWith(newOptHolder);
            newOptHolder.appendChild(opt);
        };

        const optHolder = card.querySelector(`#optHolder`);

        optHolder.style.maxWidth = `63%`

        const saveBtn = card.querySelector(`#save`);

        for(e of Object.entries(config[key])) {
            const name = config.strings[key + `Extended`] && config.strings[key + `Extended`][e[0]] ? config.strings[key + `Extended`][e[0]] : (e[0][0].toUpperCase() + e[0].slice(1));
            const description = config.descriptions[key + `Extended`] && config.descriptions[key + `Extended`][e[0]] ? config.descriptions[key + `Extended`][e[0]] : null;
            createCard(e[0], name, description, {
                descriptions: config.descriptions[key + `Extended`] || {}, 
                strings: config.strings[key + `Extended`] || {},
                actions: config.actions[key + `Extended`] || {},
                disableInputs,
                [e[0]]: e[1] 
            }, opt, false, depth+1)
        };

        saveBtn.style.borderBottomLeftRadius = saveBtn.style.borderBottomRightRadius;
        saveBtn.style.borderTopLeftRadius = `0px`;
        saveBtn.style.borderTopRightRadius = `0px`;
        saveBtn.style.paddingRight = ``;

        opt.style.padding = `4px 12px`;
        opt.style.borderTopLeftRadius = saveBtn.style.borderBottomRightRadius;
        opt.style.borderTopRightRadius = saveBtn.style.borderBottomRightRadius;
        opt.style.borderBottomLeftRadius = disableInputs ? saveBtn.style.borderBottomRightRadius : `0px`;
        opt.style.borderBottomRightRadius = disableInputs ? saveBtn.style.borderBottomRightRadius : `0px`;
        opt.style.borderWidth = `2px`;
        opt.style.borderColor = saveBtn.style.backgroundColor
        opt.style.borderStyle = `solid`
        optHolder.appendChild(saveBtn)
        
        const bgc = depth+1 % 2 == 1 ? `rgb(35,35,35)` : `rgb(40,40,40)`;

        console.log(`bgc: ${bgc}`);

        opt.style.backgroundColor = bgc;

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
        if(card.querySelector(`#strings`)) card.querySelector(`#strings`).style.width = `100%`;

        const input = card.querySelector(`#${typeof config[key]}`);

        if(input.classList.contains(`d-none`)) input.classList.remove(`d-none`);

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
            card.querySelector(`#save`).onclick = () => updateConfig({ [key]: input.value });
        } else if(card.querySelector(`#save`)) {
            card.querySelector(`#save`).parentNode.removeChild(card.querySelector(`#save`));
            if(input) {
                input.style.borderBottomRightRadius = input.style.borderBottomLeftRadius;
                input.style.borderTopRightRadius = input.style.borderBottomLeftRadius;
            }
        };

        if(input && config.disableInputs) {
            //input.disabled = true;
            input.style.cursor = `not-allowed`;
            input.onclick = (e) => {
                e.preventDefault();
                buttonDisabledAnim(input, { noRemove: true })
            }
        };
    }

    parentNode.appendChild(card);
}

const createCards = (config) => {
    const strings = config.strings;
    const descriptions = config.descriptions;

    for (entry of Object.entries(strings)) createCard(entry[0], entry[1], descriptions[entry[0]], config, document.getElementById(`settingsList`), true, 0)

    if(bottomContent) document.getElementById(`settingsList`).appendChild(bottomContent)
}

const createServices = () => {
    const servicesBox = document.getElementById(`services`);

    const list = servicesBox.querySelector(`#list`);

    authentication.list().then(services => {
        for(const name of Object.keys(services)) {
            const obj = services[name];

            if(!list.querySelector(`#auth-` + name)) {
                const prettyName = name[0].toUpperCase() + name.slice(1);

                const element = settingsBox.cloneNode(true);

                element.querySelector(`#strings`).style.width = `100%`

                element.style.margin = `0px`
                element.style.borderRadius = (parseInt(list.style.borderRadius) - (parseInt(settingsBox.style.borderRadius) - parseInt(list.style.borderRadius))) + `px`;

                element.id = `auth-` + name;

                // name and schtuff

                const nameDiv = element.querySelector(`#name`);
                const icon = faIconExists('fab', name, true, { marginRight: `8px` });

                console.log(`${name} icon:`, icon);

                nameDiv.innerHTML = ``;

                if(icon) nameDiv.appendChild(icon);
                
                nameDiv.innerHTML += prettyName;

                const description = element.querySelector(`#description`);

                if(obj.urls && obj.urls.length > 0) {
                    const spliced = obj.urls.splice(3);

                    description.innerHTML = `Handles ` + obj.urls.join(`, `);

                    if(spliced.length > 0) {
                        description.innerHTML = `Handles ` + obj.urls.join(`, `) + ` and ${spliced.length} more`;
                    } else {
                        description.innerHTML = `Handles ` + obj.urls.join(`, `).slice(0, -1) + `, and ` + obj.urls.slice(-1)[0];
                    }
                };

                const btn = element.querySelector(`#save`).cloneNode(true);
                element.querySelector(`#save`).remove();

                btn.style.paddingRight = ``;
                btn.style.borderRadius = btn.style.borderBottomRightRadius;
                btn.innerHTML = ``;
                btn.style.margin = `4px`;

                // link / unlink button

                const unlink = btn.cloneNode(true);
                unlink.innerHTML = faIconExists(`fas`, `unlink`, true, { marginRight: `8px` }).outerHTML + ` Unlink`;
                unlink.id = `unlink`;

                unlink.onclick = () => {
                    authentication.remove(name).then(() => {
                        createServices();
                        createNotification({
                            headingText: `Unlinked ${prettyName} account.`,
                            bodyText: `Your ${prettyName} account was unlinked successfully.`
                        })
                    })
                }

                element.querySelector(`#options`).appendChild(unlink);

                const link = btn.cloneNode(true);
                link.innerHTML = faIconExists(`fas`, `link`, true, { marginRight: `8px` }).outerHTML + ` Link`;
                link.id = `link`;

                link.onclick = () => {
                    authentication.getKey(name).then(key => {
                        if(key) {
                            createServices();
                            createNotification({
                                headingText: `Linked ${prettyName} account.`,
                                bodyText: `Your ${prettyName} account was linked successfully.`
                            })
                        }
                    })
                }

                element.querySelector(`#options`).appendChild(link);

                list.appendChild(element);
            };

            const element = list.querySelector(`#auth-` + name);

            if(element.querySelector(`#connected`)) element.querySelector(`#connected`).remove();

            if(obj.authSaved) {
                const connected = settingsBox.querySelector(`#description`).cloneNode(true);
                connected.id = `connected`;
                connected.innerHTML = ``
                
                const icon = faIconExists(`fas`, `check`, true, { marginRight: `4px` });

                connected.style.fontSize = `0.8em`;
                connected.style.marginTop = `12px`;
                connected.style.color = `rgba(255,255,255,0.85)`;
                connected.appendChild(icon);
                connected.innerHTML += ` Connected`;

                element.querySelector(`#strings`).insertBefore(connected, element.querySelector(`#description`));

                element.querySelector(`#link`).disabled = true;
                element.querySelector(`#unlink`).disabled = false;
            } else if(!obj.authSaved) {
                const connected = settingsBox.querySelector(`#description`).cloneNode(true);
                connected.id = `connected`;
                connected.innerHTML = ``
                
                const icon = faIconExists(`fas`, `times`, true, { marginRight: `4px` });

                connected.style.fontSize = `0.8em`;
                connected.style.marginTop = `12px`;
                connected.style.color = `rgba(255,255,255,0.85)`;
                connected.appendChild(icon);
                connected.innerHTML += ` Not Connected`;

                element.querySelector(`#strings`).insertBefore(connected, element.querySelector(`#description`));

                element.querySelector(`#link`).disabled = false;
                element.querySelector(`#unlink`).disabled = true;
            }
        }
    })
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
    createServices();
}

const updateConfig = (json, {noUpdate, silent=false}={}) => {
    toggleButtons(false)

    const run = (newConf) => {
        parse(newConf)
        addFilenameFunctionality(newConf)
        if(!silent) createNotification({
            headingText: `Settings updated.`,
            bodyText: `Your settings were saved successfully.`,
        });
    };

    if(noUpdate && json) {
        run(json);
    } else {
        systemConfiguration.set(json).then(run);
    }
}

let paltform = navigator.platform.toLowerCase();

if(paltform.toLowerCase() != `win32` && !paltform.toLowerCase().includes(`linux`)) {
    const ffmpegCard = document.getElementById(`ffmpeg`);
    
    ffmpegCard.style.background = ffmpegCard.style.background.replace(`rgb(`, `rgba(`).replace(`)`, `, 0.5)`);
    ffmpegCard.querySelectorAll(`.btn`).forEach(btn => {
        btn.disabled = true;
        btn.style.background = btn.style.background.replace(`rgb(`, `rgba(`).replace(`)`, `, 0.5)`);
    });

    ffmpegCard.querySelector(`#txt`).innerHTML = `FFmpeg downloading is not available on your platform.<br>If FFmpeg is installed system-wide, ezytdl will use that.`
};

const parseDownloadables = () => document.body.querySelector('#downloadables').childNodes.forEach(n => {
    if(!n || !n.querySelector) return;

    const btn = n.querySelector(`#btn`);

    if(btn) {
        const href = btn.getAttribute(`href`);
        btn.removeAttribute(`href`);

        btn.onclick = (e) => {
            e.preventDefault();
            window.location.href = href;
        }
    }

    const txt = n.querySelector(`#thisVersion`);

    if(n.id && txt) {
        update.getVersion(n.id).then(v => {
            txt.innerHTML = `installed: ${v}`;
            if(txt.classList.contains(`d-none`)) {
                txt.classList.remove(`d-none`);
                txt.style.opacity = 0;
                const bounds = txt.getBoundingClientRect();
                txt.style.maxHeight = 0;
                anime({
                    targets: txt,
                    opacity: 1,
                    maxHeight: [`0px`, `100px`],
                })
            }
        });
    }
});

parseDownloadables();

if(detailsStr) system.detailsStr().then(details => {
    const detailsStrConverter = new showdown.Converter({ parseImgDimensions: true });
    detailsStr.innerHTML = detailsStrConverter.makeHtml(details.join(`\n`) + `\n`);
    detailsStr.classList.remove(`d-none`)
})

systemConfiguration.get().then(newConf => {
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