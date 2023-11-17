const systemConfiguration = useWindow.configuration

const cards = [];

const separator = document.getElementById(`separator`).cloneNode(true);

const bottomContentSeparator = separator.cloneNode(true);

const bottomContent = document.getElementById(`bottomContent`);

const detailsStr = document.getElementById(`detailsStr`);

document.getElementById(`settingsBox`).querySelector(`#options`).childNodes.forEach(node => node.classList.add(`d-none`));
const settingsBox = document.getElementById(`settingsBox`).cloneNode(true);
document.getElementById(`settingsBox`).parentNode.removeChild(document.getElementById(`settingsBox`));

const getObject = (key, optionsObj) => {
    const obj = {};

    optionsObj.childNodes.forEach(child => {
        if(child.id && child.id != `save` && !child.classList.contains(`d-none`)) {
            let id = typeof (key ? config[key] : config)[child.id];
            
            console.log(optionsObj.parentNode.id + ` > ` + optionsObj.id + ` > ` + child.id + `: ` + id)

            if(id == `object`) {
                obj[child.id] = getObject(child.id, child.querySelector(`#options`));
            } else {
                obj[child.id] = child.querySelector(`#${id}`).value;
            }
        }
    });

    console.log(`obj of ${optionsObj.id}:`, obj)

    return obj;
};

const getNewConfig = () => {
    const newObj = {};

    console.log(`cardObjs: (1)`, cardObjs)

    for(const key of Object.keys(cardObjs)) {
        if(cardObjs[key] && typeof cardObjs[key] == `object`) {
            newObj[key] = getObject(key, cardObjs[key]);
        } else if(typeof cardObjs[key] == `function`) {
            newObj[key] = cardObjs[key]();
        } else newObj[key] = cardObjs[key];
    };

    console.log(`cardObjs: (2)`, newObj)

    return newObj;
}

const saveConfigMessage = settingsBox.cloneNode(true);

saveConfigMessage.querySelector(`#name`).style.minWidth = `240px`;
saveConfigMessage.querySelector(`#description`).style.minWidth = `240px`;

saveConfigMessage.className = `d-flex justify-content-between align-items-center ez-bg`;
saveConfigMessage.id = `saveConfigMessage`;

saveConfigMessage.style.background = ``;
saveConfigMessage.style.opacity = 0;
saveConfigMessage.style.bottom = `-100px`;
saveConfigMessage.style.left = `24px`;
saveConfigMessage.style.position = `fixed`;
saveConfigMessage.style.maxWidth = `450px`;

const btnClone = saveConfigMessage.querySelector(`#save`).cloneNode(true);
btnClone.id = `revert`;
btnClone.querySelector(`#icon`).className = `fas fa-undo`;
btnClone.style.background = `rgba(255,255,255,0.8)`
btnClone.style.borderBottomLeftRadius = btnClone.style.borderBottomRightRadius;
btnClone.style.borderTopLeftRadius = btnClone.style.borderTopRightRadius;
btnClone.style.borderTopRightRadius = `0px`;
btnClone.style.borderBottomRightRadius = `0px`;
const originalPadding = btnClone.style.paddingLeft;
btnClone.style.paddingLeft = btnClone.style.paddingRight
btnClone.style.paddingRight = originalPadding;

saveConfigMessage.querySelector(`#save`).before(btnClone);

const showSaveBox = () => {
    if(!document.getElementById(`saveConfigMessage`)) {
        const node = saveConfigMessage.cloneNode(true);

        node.querySelector(`#save`).onclick = (e) => {
            node.querySelector(`#save`).disabled = true;
        
            node.querySelector(`#name`).innerHTML = `Config has been modified`;
            node.querySelector(`#description`).innerHTML = `Saving your changes...`;
        
            const newConfig = getNewConfig();
            console.log(`newConfig:`, newConfig);
        
            updateConfig(newConfig).then(() => removeSaveBox(node));
        }

        node.querySelector(`#revert`).onclick = (e) => {
            updateConfig(config, { noUpdate: true, silent: true }).then(() => removeSaveBox(node));
        }

        document.onkeyup = (e) => {
            if(((e.ctrlKey && e.key == `s`) /*|| (e.key == `Enter` || e.keyCode == 13)*/)) {
                node.querySelector(`#save`).onclick();
            }
        }

        document.body.appendChild(node);

        node.querySelector(`#name`).innerHTML = `Config has been modified`;
        node.querySelector(`#description`).innerHTML = `Make sure to save your changes!`;

        anime.remove(node);
        anime({
            targets: node,
            opacity: 1,
            bottom: 24,
            duration: 500,
            easing: `easeOutBack`,
        });
    }
};

const removeSaveBox = (node) => {
    document.onkeyup = (e) => {}

    if(!node) node = document.getElementById(`saveConfigMessage`);

    if(node) {
        node.id += `-removed`;
        anime.remove(node);
        anime({
            targets: node,
            opacity: 0,
            bottom: (node.getBoundingClientRect().height + 16) * -1,
            duration: 500,
            easing: `easeInBack`,
            complete: () => {
                node.parentNode.removeChild(node);
            }
        });
    }
}

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
            enableScroll: false,
            reanimate: false,
            enableClickRecognition: false,
            dropHook
        });
    })
};

const cardObjs = {};

const createCard = (key, string, description, config, parentNode, cardFormatting, depth) => {
    console.log(`key`, key, `name / string`, string, `config / strings`, config && config.strings ? config.strings : null, `config / descriptions`, config && config.descriptions ? config.descriptions : null);

    if(key.endsWith(`Extended`)) return;

    if(!parentNode.querySelector(`#${key}`)) {
        const newCard = settingsBox.cloneNode(true);
        newCard.id = key;

        if(!cardFormatting) {
            newCard.querySelector(`#options`).childNodes.forEach(node => {
                node.style.removeProperty(`border-bottom-right-radius`)
                node.style.removeProperty(`border-top-right-radius`)
                if(node.id != `boolean`) node.style.background = `rgb(` + `${28 - ( depth+1 * 7 )}, `.repeat(3) + `)`
            });

            newCard.querySelector(`#name`).style.removeProperty(`min-width`);
            newCard.querySelector(`#name`).style.marginRight = `16px`;

            newCard.classList.remove(`ez-card2`);

            newCard.style.padding = `0px`
            newCard.style.margin = `0px`
            newCard.style.marginTop = `0px`
            newCard.style.minHeight = `0px`
            newCard.style.width = `100%`

            newCard.style.backgroundColor = `rgba(0,0,0,0)`
        }

        parentNode.appendChild(newCard)
    } else console.log(`already present`);

    const card = parentNode.querySelector(`#` + key)

    cards.push(card);

    console.log(`card:`, card)

    card.querySelector(`#name`).innerHTML = markdown.makeHtml(string);

    if(description) {
        card.querySelector(`#description`).innerHTML = markdown.makeHtml(description);
        if(card.querySelector(`#description`).classList.contains(`d-none`)) card.querySelector(`#description`).classList.remove(`d-none`);
        card.querySelector(`#description`).style.marginBottom = `-10px`;
        if(!cardFormatting) {
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
                    progbar = null;
                }
            });
        }
        card.querySelector(`#action`).onclick = () => {
            toggleButtons(false);

            const run = () => systemConfiguration.action({key, config, args: config.actions[key].args}).then(newConfig => {
                if(newConfig && typeof newConfig == `object`) {
                    updateConfig(newConfig, { noUpdate: true });
                } else {
                    toggleButtons(true);
                }
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
        
        if(saveBtn) {
            saveBtn.style.borderBottomLeftRadius = saveBtn.style.borderBottomRightRadius;
            saveBtn.style.borderTopLeftRadius = `0px`;
            saveBtn.style.borderTopRightRadius = `0px`;
            saveBtn.style.paddingRight = ``;
    
            opt.style.padding = `4px 12px`;
            opt.style.borderTopLeftRadius = saveBtn.style.borderBottomRightRadius;
            opt.style.borderTopRightRadius = saveBtn.style.borderBottomRightRadius;
            opt.style.borderBottomLeftRadius = saveBtn.style.borderBottomRightRadius;
            opt.style.borderBottomRightRadius = saveBtn.style.borderBottomRightRadius;
            opt.style.borderWidth = `2px`;
            opt.style.borderColor = window.getComputedStyle(saveBtn).backgroundColor;
            opt.style.borderStyle = `solid`

            saveBtn.parentNode.removeChild(saveBtn);
        };

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

        cardObjs[key] = opt;
        
        //card.querySelector(`#save`).onclick = () => updateConfig({ [key]: getObject(key, opt) });
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
            }

            elm.oninput = () => showSaveBox();
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
                showSaveBox();
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
            card.querySelector(`#number`).oninput = () => showSaveBox();
        }

        if(cardFormatting) {
            cardObjs[key] = () => input.value;
            //card.querySelector(`#save`).onclick = () => updateConfig({ [key]: input.value });
        };
        
        if(card.querySelector(`#save`)) {
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

    if(bottomContent) document.getElementById(`settingsList`).append(bottomContentSeparator, bottomContent)
}

const createServices = () => {
    const servicesBox = document.getElementById(`services`);

    const list = servicesBox.querySelector(`#list`);

    authentication.list().then(originalServices => {
        const useServices = {
            default: [],
        };
        
        const keys = Object.keys(originalServices).sort((a,b) => (originalServices[a].hoist || 0) - (originalServices[b].hoist || 0))

        keys.forEach(o => {
            const hoist = originalServices[o].hoist || `default`;

            if(!useServices[hoist]) useServices[hoist] = [];

            useServices[hoist].push(o);
        })

        const services = Object.values(useServices).reduce((a,b) => a.concat(b), []);

        console.log(`service:`, `services organized`, useServices, `services array`, services, `original keys`, keys.map(s => `${s}: ${originalServices[s].hoist || 0}`))

        for(const i of Object.keys(services)) {
            const name = keys[i];

            const obj = originalServices[name];

            console.log(`service:`, i, name, obj)

            if(!list.querySelector(`#auth-` + name)) {
                let addedSeparator = false;
                
                const separatorID = `separator-${i}`

                if(!list.querySelector(`#${separatorID}`)) {
                    const thisSeparator = separator.cloneNode(true);
                    thisSeparator.id = separatorID;
                    thisSeparator.style.margin = `${i == 0 ? `0px` : `16px`} 4px 16px 4px`

                    const title = thisSeparator.querySelector(`#title`)
                    title.innerHTML = obj.hoist;

                    list.appendChild(thisSeparator);

                    console.log(`service: ${i} / ${name} adding separator with name ${separatorID}`)

                    addedSeparator = true;
                }

                const prettyName = name[0].toUpperCase() + name.slice(1);

                const element = settingsBox.cloneNode(true);

                element.querySelector(`#strings`).style.width = `100%`

                element.style.margin = `0px`
                element.style.borderRadius = (parseInt(list.style.borderRadius) - (parseInt(settingsBox.style.borderRadius) - parseInt(list.style.borderRadius))) + `px`;

                if(i > 0 && !addedSeparator) {
                    console.log(`service: ${i} / ${name} adding marginTop`)
                    element.style.marginTop = `16px`;
                } else {
                    console.log(`service: ${i} / ${name} not adding marginTop`)
                }

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
                } else if(obj.description) {
                    description.innerHTML = obj.description;
                } else {
                    description.innerHTML = `Handles ${prettyName} ???? (syl forgot to add a description to this one LOL)`;
                }

                const btn = element.querySelector(`#save`).cloneNode(true);
                element.querySelector(`#save`).remove();

                btn.style.paddingRight = ``;
                btn.style.borderRadius = btn.style.borderBottomRightRadius;
                btn.innerHTML = ``;
                btn.style.margin = `4px`;

                // link / unlink button

                const unlink = btn.cloneNode(true);

                const unlinkContent = [
                    faIconExists(`fas`, obj.icons && obj.icons[0] ? obj.icons[0] : `unlink`, true, { marginRight: `8px` }).outerHTML,
                    obj.buttons && obj.buttons[0] ? obj.buttons[0] : `Unlink`
                ]

                unlink.innerHTML = unlinkContent.join(` `);

                unlink.id = `unlink`;

                unlink.onclick = () => {
                    authentication.remove(name).then(() => {
                        createServices();
                        createNotification({
                            headingText: `Removed ${prettyName}.`,
                            bodyText: `Your ${prettyName} service was removed successfully.`
                        })
                    })
                }

                element.querySelector(`#options`).appendChild(unlink);

                const link = btn.cloneNode(true);
                
                const linkContent = [
                    faIconExists(`fas`, obj.icons && obj.icons[1] ? obj.icons[1] : `link`, true, { marginRight: `8px` }).outerHTML,
                    obj.buttons && obj.buttons[1] ? obj.buttons[1] : `Link`
                ]

                link.innerHTML = linkContent.join(` `)

                link.id = `link`;

                link.onclick = () => {
                    authentication.getKey(name).then(key => {
                        if(key) {
                            createServices();
                            createNotification({
                                headingText: `Added ${prettyName} service.`,
                                bodyText: `Your ${prettyName} service was created successfully.`
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
                connected.innerHTML += ` Active`;

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
                connected.innerHTML += ` Inactive`;

                element.querySelector(`#strings`).insertBefore(connected, element.querySelector(`#description`));

                element.querySelector(`#link`).disabled = false;
                element.querySelector(`#unlink`).disabled = true;
            }

            if(obj.extendedDescription) {
                if(!element.querySelector(`#extendedDescription`)) {
                    const extendedDescription = element.querySelector(`#description`).cloneNode(true);
                    extendedDescription.id = `extendedDescription`;
                    extendedDescription.style.marginTop = `12px`;
                    extendedDescription.style.marginBottom = `-10px`;
                    extendedDescription.style.fontSize = `0.8em`;
                    element.querySelector(`#description`).after(extendedDescription);
                }

                element.querySelector(`#extendedDescription`).innerHTML = markdown.makeHtml(obj.extendedDescription);
            } else if(element.querySelector(`#extendedDescription`)) {
                element.querySelector(`#extendedDescription`).remove();
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

const updateConfig = (json, {noUpdate, silent=false}={}) => new Promise(res => {
    toggleButtons(false)

    const run = (newConf) => {
        parse(newConf)
        addFilenameFunctionality(newConf)
        if(!silent) createNotification({
            headingText: `Settings updated.`,
            bodyText: `Your settings were saved successfully.`,
        });
        res(newConf);
    };

    if(noUpdate && json) {
        run(json);
    } else {
        systemConfiguration.set(null, json).then(run);
    }
})

useWindow.getNewConfig = getNewConfig

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
    const arr = Object.entries(details);

    console.log(`detailsStr`, arr)

    detailsStr.innerHTML = ``;

    for(const [k, v] of arr) {
        console.log(`detailsStr`, k, v)

        detailsStr.innerHTML += objToDOM(k, v).innerHTML
    }

    console.log(`detailsStr`, `done`)

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