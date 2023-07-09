let hasFFmpeg = false;
let enabledConversionFormats = [];

const animateHiddenOptions = (node, ffmpegOptions, {
    expand=true, 
    immediate=false
}={}) => {
    const displayNone = ffmpegOptions.classList.contains(`d-none`);
    const originalMaxHeight = ffmpegOptions.style.maxHeight;

    if(displayNone) ffmpegOptions.classList.remove(`d-none`);
    ffmpegOptions.style.maxHeight = ``;

    const ffmpegBoundingClientRect = ffmpegOptions.getBoundingClientRect()

    if(displayNone) ffmpegOptions.classList.add(`d-none`)
    ffmpegOptions.style.maxHeight = originalMaxHeight;

    const doExpand = expand && (ffmpegOptions.hasAttribute(`hidden`) ? ffmpegOptions.getAttribute(`hidden`) == `true` : displayNone);
    const doShrink = !expand && (ffmpegOptions.hasAttribute(`hidden`) ? ffmpegOptions.getAttribute(`hidden`) == `false` : !displayNone);

    console.log(`${doExpand ? `Opening` : doShrink ? `Closing` : `(${expand ? `supposed to open` : `supposed to close`}) No action to`} hidden options "${ffmpegOptions.id}" ${immediate ? `immediately` : `with animation`}`)

    const add = [
        parseInt(window.getComputedStyle(ffmpegOptions).marginBottom),
        parseInt(window.getComputedStyle(ffmpegOptions).marginTop),
    ]

    const newHeight = (ffmpegBoundingClientRect.height + add.reduce((a, b) => a + b, 0));

    if(doExpand) {
        anime.remove(ffmpegOptions);

        ffmpegOptions.setAttribute(`hidden`, `false`);

        if(displayNone) ffmpegOptions.classList.remove(`d-none`);

        if(ffmpegOptions.querySelector(`#additional`)) {
            if(!config.advanced && !ffmpegOptions.querySelector(`#additional`).classList.contains(`d-none`)) {
                ffmpegOptions.querySelector(`#additional`).classList.add(`d-none`);
            } else if(config.advanced && ffmpegOptions.querySelector(`#additional`).classList.contains(`d-none`)) {
                ffmpegOptions.querySelector(`#additional`).classList.remove(`d-none`);
            };

            ffmpegOptions.querySelector(`#additional`).childNodes.forEach(n => {
                if(n && n.placeholder && n.id) n.value = ``;
            });
        }

        if(immediate) {
            ffmpegOptions.style.opacity = `100%`;
        } else if(config.reduceAnimations) {
            anime({
                targets: ffmpegOptions,
                opacity: [`0%`, `100%`],
                duration: 500,
                easing: `easeOutExpo`,
            });
        } else {
            anime({
                targets: ffmpegOptions,
                maxHeight: [`0px`, newHeight + `px`],
                opacity: [`0%`, `100%`],
                duration: 500,
                easing: `easeOutExpo`,
                complete: () => {
                    ffmpegOptions.style.maxHeight = ``;
                }
            });
        }
    } else if(doShrink) {
        anime.remove(ffmpegOptions);

        ffmpegOptions.setAttribute(`hidden`, `true`);

        if(immediate) {
            ffmpegOptions.style.opacity = `0%`;
            if(!ffmpegOptions.classList.contains(`d-none`)) ffmpegOptions.classList.add(`d-none`);
            if(ffmpegOptions.resetSelection) ffmpegOptions.resetSelection();
        } else if(config.reduceAnimations) {
            ffmpegOptions.style.maxHeight = `0px`;
            anime({
                targets: ffmpegOptions,
                opacity: [`100%`, `0%`],
                duration: 500,
                easing: `easeOutExpo`,
                complete: () => {
                    if(!ffmpegOptions.classList.contains(`d-none`)) ffmpegOptions.classList.add(`d-none`);
                    if(ffmpegOptions.resetSelection) ffmpegOptions.resetSelection();
                }
            });
        } else {
            anime({
                targets: ffmpegOptions,
                maxHeight: [ffmpegBoundingClientRect.height, `0px`],
                opacity: [`100%`, `0%`],
                duration: 500,
                easing: `easeOutExpo`,
                complete: () => {
                    if(!ffmpegOptions.classList.contains(`d-none`)) ffmpegOptions.classList.add(`d-none`);
                    if(ffmpegOptions.resetSelection) ffmpegOptions.resetSelection()
                    ffmpegOptions.style.maxHeight = ``;
                }
            });
        }
    };
};

const setupConvertDownload = (node, info, colorScheme) => {
    const presetButtonClone = node.querySelector(`#ffmpegOptions`) ? node.querySelector(`#ffmpegOptions`).querySelector(`#custom`).cloneNode(true) : null;

    const ffmpegOptions = node.querySelector(`#ffmpegOptions`);

    const ffmpegCustomOptions = ffmpegOptions.querySelector(`#ffmpegCustomOptions`);

    let buttons = ffmpegOptions.querySelectorAll(`.formatPreset`);

    let currentSelected = null;

    if(info._platform == `file` && node.querySelector(`#saveOptions`) && !node.querySelector(`#confirmDownload-2`)) {
        const appendTo = node.querySelector(`#innerFormatCard`) || node;

        if(node.querySelector(`#fileOptions`) && node.querySelector(`#fileOptionsText`)) {
            appendTo.appendChild(node.querySelector(`#fileOptionsText`));
            node.querySelector(`#fileOptions`).querySelector(`#basedir`).innerHTML = info.saveLocation || config.saveLocation || `{default save location}`;
            appendTo.appendChild(node.querySelector(`#fileOptions`));
            if(info.entries && info.entries.length > 0) appendTo.querySelector(`#saveLocation`).value = info.title
        }

        const confirmDownloadBtn = node.querySelector(`#saveOptions`).querySelector(`#confirmDownload`).cloneNode(true);
        confirmDownloadBtn.id += `-2`
        if(node.querySelector(`#innerQualityButtons`)) node.querySelector(`#innerQualityButtons`).remove();
        ffmpegOptions.remove();
        ffmpegOptions.classList.remove(`d-none`);

        appendTo.appendChild(ffmpegOptions);

        confirmDownloadBtn.style.width = `100%`
        confirmDownloadBtn.innerHTML = confirmDownloadBtn.innerHTML.replace(`Download`, `Convert`)
        confirmDownloadBtn.querySelector(`#icon`).replaceWith(node.querySelector(`#saveOptions`).querySelector(`#convertDownload`).querySelector(`#icon`))
        //node.querySelector(`#saveOptions`).querySelector(`#convertDownload`).remove();

        /*if(node.querySelector(`#metadataOptions`) && node.querySelector(`#saveMetadataText`)) {
            appendTo.appendChild(node.querySelector(`#saveMetadataText`));
            if(node.querySelector(`#metadataOptions`).querySelector(`#thumbnail`)) node.querySelector(`#metadataOptions`).querySelector(`#thumbnail`).remove();
            appendTo.appendChild(node.querySelector(`#metadataOptions`));
        }*/

        appendTo.appendChild(confirmDownloadBtn);

        if(!node.querySelector(`#saveOptions`).classList.contains(`d-none`)) node.querySelector(`#saveOptions`).classList.add(`d-none`);
        if(!node.querySelector(`#downloadButtons`).classList.contains(`d-none`)) node.querySelector(`#downloadButtons`).classList.add(`d-none`);
        if(node.querySelector(`#buttonsDiv`) && !node.querySelector(`#buttonsDiv`).classList.contains(`d-none`)) node.querySelector(`#buttonsDiv`).classList.add(`d-none`);
        node.querySelector(`#saveOptions`).remove();
    }

    const customFormat = {
        key: `custom`,
        name: `Custom Format`,
        description: `Customize your conversion!`,
        icon: `fa-wrench`,
    }

    const setPreset = (node, instant) => {
        if(node && currentSelected == node.id) {
            buttonDisabledAnim(node, {noRemove: true});
        } else {
            const previousSelected = currentSelected;
            currentSelected = node ? node.id : null;
            const previousSelectedConversion = info.selectedConversion;
            info.selectedConversion = node.id == `custom` ? customFormat : (currentSelected && enabledConversionFormats.find(o => o.key == currentSelected)) ? Object.assign({}, enabledConversionFormats.find(o => o.key == currentSelected), { key: currentSelected }) : null;
            buttons.forEach(btn => {
                if(btn.id && btn.style) {
                    if(btn.id == currentSelected) {
                        if(btn.id == previousSelected) return;

                        console.log(`reset`, info.selectedConversion)

                        if(!previousSelectedConversion || info.selectedConversion.noEdit != previousSelectedConversion.noEdit) {
                            resetTrim(info.selectedConversion.noEdit ? true : false);
                        }

                        anime.remove(btn);

                        const targetColor = colorScheme.light

                        anime({
                            targets: btn,
                            scale: 1.1,
                            backgroundColor: `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})`,
                            duration: instant ? 0 : 300,
                            easing: `easeOutCirc`,
                        });

                        if(btn.id == `custom`) {
                            animateHiddenOptions(node, ffmpegCustomOptions);
                        } else {
                            animateHiddenOptions(node, ffmpegCustomOptions, {expand: false});
                        }
                    } else if(btn.id == previousSelected || previousSelected == null) {
                        anime.remove(btn);
                        
                        anime({
                            targets: btn,
                            scale: 0.94,
                            backgroundColor: `rgba(255,255,255,0.85)`,
                            opacity: 0.9,
                            duration: instant ? 0 : 300,
                            easing: `easeOutCirc`,
                        })
                    }
                }
            })
        }
    };

    const getOptionsStr = (obj) => {
        let str = ``;

        for(const key of Object.keys(obj)) {
            const value = obj[key];
            if(typeof value == `object`) {
                str += `${key}: { ${getOptionsStr(value)} }, `;
            } else {
                str += `${key}: ${value}, `;
            }
        };
        
        return str;
    }

    const resetPresetOptions = () => {
        console.log(`resetting preset options:`, enabledConversionFormats)

        const customPresetButton = ffmpegOptions.querySelector(`#custom`);

        for(const options of [...enabledConversionFormats, customFormat]) {
            const { key } = options;

            if(!ffmpegOptions.querySelector(`#${key}`)) {
                const thisNode = presetButtonClone.cloneNode(true);
                thisNode.style.transform = `scale(0.94)`;
                thisNode.style.opacity = 0.9;
                thisNode.style.backgroundColor = `rgba(255,255,255,0.85)`;
                thisNode.style.color = `rgb(0,0,0)`;
                thisNode.id = `${key}`;
                thisNode.querySelector(`#name`).innerText = options.name;
                thisNode.querySelector(`#description`).innerText = options.description;
                thisNode.querySelector(`#icon`).className = `fas ${options.icon || `fa-wrench`}`;

                if(options.options) thisNode.setAttribute(`title`, getOptionsStr(options.options));

                customPresetButton.parentElement.appendChild(thisNode);
            } else customPresetButton.parentElement.appendChild(ffmpegOptions.querySelector(`#${key}`))

            const node = ffmpegOptions.querySelector(`#${key}`);
            
            if(options.options) node.setAttribute(`options`, JSON.stringify(options.options));

            node.onclick = () => setPreset(node);
        };

        buttons = ffmpegOptions.querySelectorAll(`.formatPreset`);
    };

    resetPresetOptions();

    ffmpegCustomOptions.querySelector(`#saveAsPreset`).onclick = () => {
        if(ffmpegCustomOptions.getAttribute(`hidden`) == `false`) {
            const opt = getSaveOptions(node, info, null, {
                getConvertOnly: true,
                ignore: [`trimFrom`, `trimTo`]
            });

            if(!opt.ext) return createNotification({
                type: `warn`,
                headingText: `No target extension!`,
                bodyText: `Please enter a target extension for your preset. (e.g. mp4, mp3, etc.)`
            });

            dialog.create({
                title: `Custom Preset`,
                body: `Enter a name & description for your custom preset.`,
                inputs: [ 
                    { id: `name`, text: `Name` }, 
                    { id: `description`, text: `Description` }
                ],
                buttons: [
                    {
                        text: `Cancel`,
                        id: `no`,
                        icon: `cross`
                    },
                    {
                        text: `Save`,
                        id: `yes`,
                        icon: `check`,
                        primary: true,
                    },
                ]
            }).then(async ({ event, id, response, inputs }) => {
                if(response == `yes`) {
                    console.log(inputs);

                    const name = inputs.find(o => o.id == `name`).value;
                    const description = inputs.find(o => o.id == `description`).value;

                    if(!name) return createNotification({
                        type: `warn`,
                        headingText: `No name provided!`,
                        bodyText: `Please enter a name for your preset.`
                    });

                    if(!description) return createNotification({
                        type: `warn`,
                        headingText: `No description provided!`,
                        bodyText: `Please enter a description for your preset.`
                    });

                    console.log(`got response`, response, inputs);

                    const key = ("custom-" + name + "-" + opt.ext).replace(/[^a-zA-Z0-9]/g, "-");

                    const continueSave = await new Promise(res => {
                        if(typeof config.ffmpegPresets[key] != 'undefined') {
                            dialog.create({
                                title: `Overwrite preset?`,
                                body: `A preset with the name "${name}" (${key}) already exists. Would you like to overwrite it?`,
                                buttons: [
                                    {
                                        text: `No`,
                                        id: `no`,
                                        icon: `cross`
                                    },
                                    {
                                        text: `Yes`,
                                        id: `yes`,
                                        icon: `check`,
                                        primary: true,
                                    },
                                ]
                            }).then(({ event, id, response, inputs }) => {
                                res(response == `yes`);
                            })
                        } else res(true);
                    })
                    
                    if(continueSave) configuration.set(`ffmpegPresets`, {
                        [key]: {
                            key,
                            name: name,
                            description: description,
                            defaultEnabled: true,
                            options: opt
                        }
                    }).then((o) => {
                        enabledConversionFormats = o.filter(o => config.ffmpegPresets[o.key]);
                        console.log(`enabled conversion formats`, enabledConversionFormats)

                        resetPresetOptions();

                        createNotification({
                            headingText: `Preset Saved!`,
                            bodyText: `Your preset has been saved!`,
                        })
                    })
                };
            });
        }
    }

    ffmpegOptions.resetSelection = () => setPreset(null, true);

    if(!ffmpegOptions.hasAttribute(`default`)) ffmpegOptions.setAttribute(`default`, info.audio && !info.video ? `mp3` : `mp4`)

    const defaultOption = ffmpegOptions.getAttribute(`default`);

    const usableOption = enabledConversionFormats.find(o => o.key == defaultOption) ? defaultOption : null;

    console.log(`default option: ${defaultOption} -- parsed: ${usableOption}`)

    const resetTrim = (hide) => {
        const params = {
            noEntries: (typeof info.entry_number == `number` ? true : (info.entries ? false : true)),
            duration: info.duration ? true : false,
            durationTimestamp: info.duration ? info.duration.timestamp != `--:--` : false,
        }

        const showOptions = (Object.values(params).filter(o => o).length == Object.keys(params).length) ? true : false;

        console.log(`resetTrim; showing: ${showOptions}; hide: ${hide};`, params, info)

        if(showOptions) {
            const trimFrom = node.querySelector(`#trimFrom`), trimFromInput = node.querySelector(`#trimFromInput`);
            const trimTo = node.querySelector(`#trimTo`), trimToInput = node.querySelector(`#trimToInput`);

            const modifyInput = (range, input, source, value, animate) => {
                const setRange = (val) => {
                    if(range && animate) {
                        anime({
                            targets: range,
                            value: val,
                            duration: 250,
                            easing: `easeOutExpo`,
                        })
                    } else if(range) {
                        range.value = val;
                    }
                }

                const useValue = typeof value == `string` && Number(value) && !value.includes(`:`) ? `00:${value}` : value;
    
                const time = util.time(useValue, null, {allowZero: true})
    
                if(source == `from` && (time.units.ms/1000)+1 > Number(trimTo.value)) {
                    setRange(trimTo.value);
                    if(input) input.value = util.time((Number(trimTo.value)-1)*1000, null, {allowZero: true}).timestamp;
                } else if(source == `to` && (time.units.ms/1000)-1 < Number(trimFrom.value)) {
                    if(range) setRange(trimFrom.value);
                    if(input) input.value = util.time((Number(trimFrom.value)+1)*1000, null, {allowZero: true}).timestamp;
                } else {
                    if(range) setRange(time.units.ms/1000);
                    if(input) input.value = time.timestamp;
                }
            };

            if(!trimFrom.hasAttribute(`resizedWidth`)) {
                trimFrom.setAttribute(`resizedWidth`, `true`)

                const parentStyle = window.getComputedStyle(node);
        
                console.log(formatCardBounds, formatCardComputed);
    
                const subtract = {
                    paddingLeft: parseInt(parentStyle.paddingLeft || formatCardComputed.paddingLeft || innerFormatCardStyle.paddingLeft || node.style.paddingLeft || 0),
                    paddingRight: parseInt(parentStyle.paddingRight || formatCardComputed.paddingRight || innerFormatCardStyle.paddingRight || node.style.paddingRight || 0),
                }
        
                const targetWidth = parseInt(formatCardBounds.width) - Object.values(subtract).reduce((a,b) => a+b, 0) + `px`;
        
                console.log(`targetWidth`, targetWidth, `bounds width`, formatCardBounds.width, `subtract`, subtract, `node id`, node.id)
        
                trimFrom.style.width = targetWidth;
                trimTo.style.width = targetWidth;
                node.querySelector(`#trimContainer`).style.width = targetWidth;
            }
        
            trimFrom.oninput = () => modifyInput(trimFrom, trimFromInput, `from`, Number(trimFrom.value)*1000);
            trimTo.oninput = () => modifyInput(trimTo, trimToInput, `to`, Number(trimTo.value)*1000);
    
            trimFromInput.oninput = () => modifyInput(trimFrom, null, `from`, trimFromInput.value, true);
            trimToInput.oninput = () => modifyInput(trimTo, null, `to`, trimToInput.value, true);
            trimFromInput.onblur = () => modifyInput(trimFrom, trimFromInput, `from`, trimFromInput.value, true);
            trimToInput.onblur = () => modifyInput(trimTo, trimToInput, `to`, trimToInput.value, true);
    
            trimFrom.max = Math.ceil(info.duration.units.ms/1000);
            modifyInput(trimFrom, trimFromInput, `from`, 0, true);
    
            trimTo.max = Math.ceil(info.duration.units.ms/1000);
            modifyInput(trimTo, trimToInput, `to`, (Math.ceil(info.duration.units.ms/1000))*1000, true);
    
            info.trim = {};

            if(hide) {
                if(node.querySelector(`#trimOptions`).style.opacity != `0.5`) node.querySelector(`#trimOptions`).style.opacity = `0.5`;
                if(node.querySelector(`#trimOptions`).style.pointerEvents != `none`) node.querySelector(`#trimOptions`).style.pointerEvents = `none`;
                trimFrom.disabled = true;
                trimTo.disabled = true;
            } else {
                if(node.querySelector(`#trimOptions`).style.opacity == `0.5`) node.querySelector(`#trimOptions`).style.opacity = `1`;
                if(node.querySelector(`#trimOptions`).style.pointerEvents == `none`) node.querySelector(`#trimOptions`).style.pointerEvents = ``;
                trimFrom.disabled = false;
                trimTo.disabled = false;
            }
        } else {
            if(!node.querySelector(`#trimOptions`).classList.contains(`d-none`)) node.querySelector(`#trimOptions`).classList.add(`d-none`);
            if(!node.querySelector(`#trimText`).classList.contains(`d-none`)) node.querySelector(`#trimText`).classList.add(`d-none`);
        }
    };

    setPreset(usableOption ? ffmpegOptions.querySelector(`#${usableOption}`) || null : null, true); // set default preset

    resetTrim(false)
    
    node.querySelector(`#conversionDiv`).appendChild(node.querySelector(`#outputExtension`) || listboxTemplate.querySelector(`#outputExtension`).cloneNode(true));
}

const conversionOptions = (node, info, colorScheme) => {
    //node.querySelector(`#saveLocation`).placeholder = `${config && config.saveLocation ? config.saveLocation : `{default save location}`}`;
    //node.querySelector(`#saveLocation`).value = `${config && config.saveLocation ? config.saveLocation : ``}`;
    node.querySelector(`#basedir`).innerText = `${info.saveLocation || (config && config.saveLocation ? config.saveLocation : `Save Location`)}`;

    //console.log(`config`, config)

    //console.log(`video conversion enabled`)
    if(info.resolution) node.querySelector(`#videoResolution`).placeholder = `${info.resolution}`
    if(info.vbr) node.querySelector(`#videoBitrate`).placeholder = `Bitrate (${info.vbr}k)`
    if(info.fps) node.querySelector(`#videoFPS`).placeholder = `FPS (${info.fps})`

    //console.log(`audio conversion enabled`)
    if(info.asr) node.querySelector(`#audioSampleRate`).placeholder = `Sample Rate (${info.asr/1000}k)`
    if(info.abr) node.querySelector(`#audioBitrate`).placeholder = `Bitrate (${info.abr}k)`;

    const metaButtons = node.querySelector(`#metadataOptions`).querySelectorAll(`.btn`)
    
    if(hasFFmpeg) {
        if(info._platform == `file`) {
            setupConvertDownload(node, info, colorScheme);
        } else if(node.querySelector(`#convertDownload`)) node.querySelector(`#convertDownload`).onclick = () => {
            setupConvertDownload(node, info, colorScheme);

            animateHiddenOptions(node, node.querySelector(`#ffmpegOptions`));
    
            anime({
                targets: node.querySelector(`#convertDownload`),
                width: [`49%`, `0%`],
                maxWidth: [`49%`, `0%`],
                padding: 0,
                opacity: [1, 0],
                duration: 500,
                easing: `easeOutExpo`,
            });
    
            anime({
                targets: node.querySelector(`#confirmDownload`),
                width: [`49%`, `100%`],
                duration: 500,
                easing: `easeOutExpo`,
            });
        }

        metaButtons.forEach(m => {
            const icon = m.querySelector(`#icon`);
    
            m.onclick = () => {
                if(m.getAttribute(`value`) == `true`) {
                    m.setAttribute(`value`, `false`);
                    if(icon.classList.contains(`fa-check-circle`)) {
                        icon.classList.remove(`fa-check-circle`);
                        icon.classList.add(`fa-times-circle`);
                    }
    
                    anime.remove(m);
                    anime({
                        targets: m,
                        scale: 0.9,
                        opacity: 0.65,
                        duration: 300,
                        easing: `easeOutExpo`,
                    })
                } else {
                    m.setAttribute(`value`, `true`);
                    if(icon.classList.contains(`fa-times-circle`)) {
                        icon.classList.remove(`fa-times-circle`);
                        icon.classList.add(`fa-check-circle`);
                    }
    
                    anime.remove(m);
                    anime({
                        targets: m,
                        scale: 1,
                        opacity: 1,
                        duration: 300,
                        easing: `easeOutExpo`,
                    })
                }
            }
        });
    } else {
        let sentNotif = false;
        metaButtons.forEach(m => {
            const icon = m.querySelector(`#icon`);
            m.style.scale = 0.9;
            m.style.opacity = 0.65;
            m.onclick = () => {
                if(!sentNotif) {
                    sentNotif = true;
                    createNotification({
                        headingText: `FFmpeg not found!`,
                        bodyText: `FFmpeg is required to add metadata. Please install FFmpeg and try again.`,
                        type: `warn`
                    });
                }
                buttonDisabledAnim(m, {
                    opacity: [0.75, 0.65],
                });
            }
            if(icon.classList.contains(`fa-check-circle`)) {
                icon.classList.remove(`fa-check-circle`);
                icon.classList.add(`fa-times-circle`);
            }
        });

        console.log(node.querySelector(`#confirmDownload`).parentElement, node.querySelector(`#convertDownload`))

        node.querySelector(`#confirmDownload`).style.width = `100%`;
        node.querySelector(`#convertDownload`).classList.add(`d-none`)
        //node.querySelector(`#convertDownload`).style.width = `0%`;
        //node.querySelector(`#convertDownload`).style.maxWidth = `0%`;
        //node.querySelector(`#convertDownload`).style.padding = `0px`;
        //node.querySelector(`#convertDownload`).style.opacity = `0`;
    }
}