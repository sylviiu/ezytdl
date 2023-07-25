const getDirectChild = (node, id) => {
    let found = null;

    for (child of node.childNodes) {
        if(child.id == id) {
            found = child;
            break;
        }
    }
    
    return found
}

const setDefaultSaveOptValues = (node, info, colorScheme) => {
    if(node.querySelector(`#outputExtension`)) {
        node.querySelector(`#outputExtension`).placeholder = `ext`;
    } else console.log(`no formatConversionTextbox`)

    if(node.querySelector(`#saveLocation`)) {
        //console.log(`setting saveLocation values`)

        conversionOptions(node, info, colorScheme)

        if(info.entries && info.entries.length > 0) {
            //if(!node.querySelector(`#saveLocation`).value.endsWith(navigator.platform.toLowerCase() == `win32` ? `\\` : `/`)) node.querySelector(`#saveLocation`).value += navigator.platform.toLowerCase() == `win32` ? `\\` : `/`
            node.querySelector(`#saveLocation`).value = (info._platform == `file` ? `Converted` : info.title)
        } else if(info.album) {
            node.querySelector(`#saveLocation`).value = info.album
        } else if(info[`playlist-title`]) {
            node.querySelector(`#saveLocation`).value = info[`playlist-title`]
        }
    } else console.log(`no saveLocation`)
};

const getQualityButtons = (node) => {
    if(node.querySelector(`#qualityButtons`)) {
        return node.querySelector(`#qualityButtons`)
    } else if(node.id == `qualityButtons`) {
        return node
    } else if(node.parentNode && node.parentNode.querySelector(`#qualityButtons`)) {
        return node.parentNode.querySelector(`#qualityButtons`)
    } else return null;
}

const addMissingNodes = (node) => {
    if(!getQualityButtons(node).querySelector(`#saveOptions`)) {
        const saveOptions = formatCard.querySelector(`#saveOptions`).cloneNode(true);

        if(getQualityButtons(node)) {
            getQualityButtons(node).appendChild(saveOptions);
        } else {
            node.appendChild(saveOptions);
        }
    }
}

const saveOptionsAnimations = {
    fadeIn: (btn, saveOptions, btnClick, node) => new Promise(res => {
        anime.remove(saveOptions)
        
        if(node && node.parentNode && node.parentNode.parentNode && node.parentNode.parentNode.id != `mainContainer` && node.parentNode.parentNode.querySelector(`#formatCardBG`)) {
            const bg = node.parentNode.parentNode.querySelector(`#formatCardBG`);

            anime.remove(bg);

            if(!config.reduceAnimations && !config.disableAnimations) {
                anime({
                    targets: bg,
                    filter: `blur(5px)`,
                    opacity: [`35%`, `10%`],
                    duration: 500,
                    easing: `easeOutExpo`
                })
            } else {
                anime({
                    targets: bg,
                    opacity: [`35%`, `10%`],
                    duration: 500,
                    easing: `easeOutExpo`
                })
            }
        }

        const prevMaxHeight = saveOptions.style.maxHeight;
        saveOptions.style.maxHeight = null;
        let dNone = saveOptions.classList.contains(`d-none`);
        if(dNone) saveOptions.classList.remove(`d-none`);
        const { height } = saveOptions.getBoundingClientRect();
        saveOptions.style.maxHeight = prevMaxHeight;
        if(dNone) saveOptions.classList.add(`d-none`);

        if(btn) btn.onclick = () => {}
        saveOptions.classList.remove(`d-none`);
        saveOptions.classList.add(`d-flex`);
        if(config.reduceAnimations) {
            saveOptions.style.maxHeight = height + `px`;
            saveOptions.style.marginTop = `8px`;
            anime({
                targets: saveOptions,
                opacity: [`0%`, `100%`],
                duration: 500,
                easing: `easeOutExpo`,
                complete: () => {
                    saveOptions.style.maxHeight = null;
                    if(btn) btn.onclick = () => btnClick();
                    res();
                }
            });
        } else {
            anime({
                targets: saveOptions,
                maxHeight: [`0px`, height],
                opacity: [`0%`, `100%`],
                marginTop: [`0px`, `8px`],
                duration: 500,
                easing: `easeOutExpo`,
                complete: () => {
                    saveOptions.style.maxHeight = null;
                    if(btn) btn.onclick = () => btnClick();
                    res();
                }
            });
        }

        if(btn) {
            console.log(saveOptions.parentNode.parentNode)

            anime({
                targets: btn.querySelector(`#downloadicon`),
                rotate: [`0deg`, `180deg`],
                duration: 500,
                easing: `easeOutExpo`
            });

            if(saveOptions && saveOptions.parentNode && saveOptions.parentNode.parentNode && saveOptions.parentNode.parentNode.id == `formatCard`) {
                const formatCard = saveOptions.parentNode.parentNode;

                const clearInput = (n) => {
                    if(n && n.placeholder) {
                        n.value = ``;
                    }
                }
        
                formatCard.querySelector(`#audioOptions`).childNodes.forEach(clearInput)
                formatCard.querySelector(`#videoOptions`).childNodes.forEach(clearInput)

                animateHiddenOptions(node, formatCard.querySelector(`#ffmpegCustomOptions`), {expand: false, immediate: true});
                animateHiddenOptions(node, formatCard.querySelector(`#ffmpegOptions`), {expand: false, immediate: true});
                
                /*if(!formatCard.querySelector(`#ffmpegCustomOptions`).classList.contains(`d-none`)) {
                    formatCard.querySelector(`#ffmpegCustomOptions`).classList.add(`d-none`);
                }
                
                if(!formatCard.querySelector(`#ffmpegOptions`).classList.contains(`d-none`)) {
                    formatCard.querySelector(`#ffmpegOptions`).classList.add(`d-none`);
                }*/
        
                if(formatCard.querySelector(`#convertDownload`).style.width != `49%` && hasFFmpeg) {
                    anime.remove(formatCard.querySelector(`#convertDownload`));
                    anime.remove(formatCard.querySelector(`#confirmDownload`));
                    formatCard.querySelector(`#convertDownload`).style.opacity = 1;
                    formatCard.querySelector(`#convertDownload`).style.width = `49%`;
                    formatCard.querySelector(`#confirmDownload`).style.width = `49%`;
                    formatCard.querySelector(`#convertDownload`).style.maxWidth = null;
                }
        
                /*if(formatCard.querySelector(`#ffmpegCustomOptions`).style.maxHeight) {
                    anime.remove(formatCard.querySelector(`#ffmpegCustomOptions`));
                    formatCard.querySelector(`#ffmpegCustomOptions`).style.maxHeight = null;
                }
        
                if(formatCard.querySelector(`#ffmpegOptions`).style.maxHeight) {
                    anime.remove(formatCard.querySelector(`#ffmpegOptions`));
                    formatCard.querySelector(`#ffmpegOptions`).style.maxHeight = null;
                }*/

                anime({
                    targets: saveOptions.parentNode.parentNode,
                    scale: 1.03,
                    boxShadow: `0px 0px 15px 4px rgba(0,0,0,0.6)`,
                    duration: 500,
                    easing: `easeOutExpo`
                });
            }
        }
    }),
    fadeOut: (btn, saveOptions, btnClick, node) => new Promise(res => {
        if(saveOptions.classList.contains(`d-none`)) return res()
        
        if(node && node.parentNode && node.parentNode.parentNode && node.parentNode.parentNode.querySelector(`#formatCardBG`) && node.parentNode.parentNode.querySelector(`#formatCardBG`).style.filter) {
            const bg = node.parentNode.parentNode.querySelector(`#formatCardBG`);

            anime.remove(bg);

            if(!config.reduceAnimations && !config.disableAnimations) {
                anime({
                    targets: bg,
                    filter: `blur(0px)`,
                    opacity: [`10%`, `35%`],
                    duration: 500,
                    easing: `easeOutExpo`
                })
            } else {
                anime({
                    targets: bg,
                    opacity: [`10%`, `35%`],
                    duration: 500,
                    easing: `easeOutExpo`
                })
            }
        }
        
        if(btn) btn.onclick = () => {}

        anime.remove(saveOptions);

        if(saveOptions.style.opacity < 0.35) {
            return res()
        } else {
            const { height } = saveOptions.getBoundingClientRect();
            if(config.reduceAnimations) {
                saveOptions.style.maxHeight = height + `px`;
                anime({
                    targets: saveOptions,
                    opacity: [`100%`, `0%`],
                    duration: 500,
                    easing: `easeOutExpo`,
                    complete: () => {
                        saveOptions.style.marginTop = `0px`;
                        saveOptions.classList.remove(`d-flex`);
                        saveOptions.classList.add(`d-none`);
                        if(btn) btn.onclick = () => btnClick();
                        res();
                    }
                })
            } else {
                anime({
                    targets: saveOptions,
                    maxHeight: [height, `0px`],
                    opacity: [`100%`, `0%`],
                    marginTop: `0px`,
                    duration: 500,
                    easing: `easeOutExpo`,
                    complete: () => {
                        saveOptions.classList.remove(`d-flex`);
                        saveOptions.classList.add(`d-none`);
                        if(btn) btn.onclick = () => btnClick();
                        res();
                    }
                })
            }

            if(btn) {
                anime({
                    targets: btn.querySelector(`#downloadicon`),
                    rotate: [`180deg`, `0deg`],
                    duration: 500,
                    easing: `easeOutExpo`
                })

                if(saveOptions && saveOptions.parentNode && saveOptions.parentNode.parentNode && saveOptions.parentNode.parentNode.id == `formatCard`) {
                    anime({
                        targets: saveOptions.parentNode.parentNode,
                        scale: 1,
                        boxShadow: `0px 0px 15px 4px rgba(0,0,0,0)`,
                        duration: 500,
                        easing: `easeOutExpo`
                    });
                }
            }
        }
    })
};

const send = ({card, node, info, format, overrideDownloadObj, centerURLBox}) => {
    node.querySelectorAll(`.btn`).forEach(btn => btn.disabled = true);

    const saveOpt = getSaveOptions(card || node, info, Object.assign({}, {
        format,
    }, overrideDownloadObj));

    startDownload(card || node, saveOpt);

    if(centerURLBox) centerURLBox(false);
}

const qualityButtons = ({node, card, info, overrideDownloadObj, centerURLBox, removeEntry, colorScheme}) => {
    //console.log(`qualityButtons`, info)

    addMissingNodes(node);

    node = getQualityButtons(node);

    const formatConversionTextbox = node.querySelector(`#outputExtension`);

    const ffmpegOptions = node.querySelector(`#ffmpegCustomOptions`);
    const ffmpegPresets = node.querySelector(`#ffmpegOptions`);
    const convertDownload = node.querySelector(`#convertDownload`);
    const confirmDownload = node.querySelector(`#confirmDownload`);

    let qualities = [`bv*+ba/b`, `ba`, `bv`];

    let currentSelected = null;

    const defaultColors = {
        background: node.querySelector(`.btn`).style.background,
        color: node.querySelector(`.btn`).style.color,
    }

    formatConversionTextbox.placeholder = `ext`;

    let configSelectionMap = [`quick`, `audio`, `video`]

    let refreshOutputExt = () => {
        console.log(`setting value to ${configSelectionMap[currentSelected]} / ${config.lastMediaConversionOutputs[configSelectionMap[currentSelected]]}`)
        formatConversionTextbox.value = config.lastMediaConversionOutputs[configSelectionMap[currentSelected]] || ``;
    }
    
    const targetColor = colorScheme.light

    let refreshQualityButtonSelection = () => {
        node.querySelectorAll(`.btn`).forEach((btn, i) => {
            if(currentSelected == i) {
                if(!btn.classList.contains(`ez-selected`)) btn.classList.add(`ez-selected`);
                anime.remove(btn);
                anime({
                    targets: btn,
                    scale: 1.1,
                    //backgroundColor: `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})`,
                    duration: 300,
                    easing: `easeOutCirc`,
                });
            } else {
                if(btn.classList.contains(`ez-selected`)) btn.classList.remove(`ez-selected`);
                anime.remove(btn);
                anime({
                    targets: btn,
                    scale: 1,
                    //backgroundColor: defaultColors.background,
                    duration: 300,
                    easing: `easeOutCirc`,
                });
            }
        });
    };

    const qualityButtonsDropdown = node.querySelector(`#saveOptions`);
    if(qualityButtonsDropdown) {
        setDefaultSaveOptValues(qualityButtonsDropdown, info, colorScheme);
        node.appendChild(qualityButtonsDropdown);
    }

    const saveLocation = node.querySelector(`#saveLocation`)

    node.querySelector(`#basedir`).innerText = `${info.saveLocation || (config && config.saveLocation ? config.saveLocation : `Save Location`)}`;
    //saveLocation.value = `${config && config.saveLocation ? config.saveLocation : ``}`;

    if(info.entries && info.entries.length > 0) {
        //if(!saveLocation.value.endsWith(`/`) && !saveLocation.value.endsWith(`\\`)) saveLocation.value += navigator.platform.toLowerCase() == `win32` ? `\\` : `/`
        saveLocation.value = (info._platform == `file` ? `Converted` : info.title)
    }

    const modifyQualityButtonsDropdown = () => {
        console.log(currentSelected)
        if(formatConversionTextbox.classList.contains(`d-none`)) formatConversionTextbox.classList.remove(`d-none`);

        const clearInput = (n) => {
            if(n && n.placeholder) {
                n.value = ``;
            }
        }

        node.querySelector(`#audioOptions`).childNodes.forEach(clearInput)
        node.querySelector(`#videoOptions`).childNodes.forEach(clearInput)
        
        animateHiddenOptions(node, ffmpegOptions, {expand: false, immediate: true});
        animateHiddenOptions(node, ffmpegPresets, {expand: false, immediate: true});

        let fallbackAudio = (!node.querySelector(`#downloadBestAudio`) || node.querySelector(`#downloadBestAudio`).classList.contains(`d-none`)) ? null : `mp3`;
        let fallbackVideo = (!node.querySelector(`#downloadBestVideo`) || node.querySelector(`#downloadBestVideo`).classList.contains(`d-none`)) ? null : `mp4`;

        ffmpegPresets.setAttribute(`default`, currentSelected == 0 ? (fallbackVideo || fallbackAudio || `none`) : currentSelected == 1 ? `mp3` : `mp4`);
        
        /*if(!ffmpegOptions.classList.contains(`d-none`)) {
            ffmpegOptions.classList.add(`d-none`);
        }
        
        if(!ffmpegPresets.classList.contains(`d-none`)) {
            ffmpegPresets.classList.add(`d-none`);
        }*/

        if(convertDownload.style.width != `49%` && hasFFmpeg) {
            anime.remove(convertDownload);
            anime.remove(confirmDownload);
            convertDownload.style.opacity = 1;
            convertDownload.style.width = `49%`;
            confirmDownload.style.width = `49%`;
            convertDownload.style.maxWidth = null;
        }

        /*if(ffmpegOptions.style.maxHeight) {
            anime.remove(ffmpegOptions);
            ffmpegOptions.style.maxHeight = null;
        }

        if(ffmpegPresets.style.maxHeight) {
            anime.remove(ffmpegPresets);
            ffmpegPresets.style.maxHeight = null;
        }*/
    
        if(formatConversionTextbox.parentNode.id != `fileOptions`) {
            console.log(`formatConversionTextbox not in fileOptions`)
            formatConversionTextbox.parentNode.removeChild(formatConversionTextbox);
            node.querySelector(`#fileOptions`).appendChild(formatConversionTextbox);
        } else console.log(`formatConversionTextbox already in fileOptions`)

        if(currentSelected == 0) {
            console.log(`modifying conversion options to both`)
            // Both
            if(node.querySelector(`#audioOptions`).classList.contains(`d-none`)) node.querySelector(`#audioOptions`).classList.remove(`d-none`)
            if(node.querySelector(`#videoOptions`).classList.contains(`d-none`)) node.querySelector(`#videoOptions`).classList.remove(`d-none`)
        } else if(currentSelected == 1) {
            console.log(`modifying conversion options to audio`)
            // Audio
            if(node.querySelector(`#audioOptions`).classList.contains(`d-none`)) node.querySelector(`#audioOptions`).classList.remove(`d-none`)
            if(!node.querySelector(`#videoOptions`).classList.contains(`d-none`)) node.querySelector(`#videoOptions`).classList.add(`d-none`)
        } else if(currentSelected == 2) {
            console.log(`modifying conversion options to video`)
            // Video
            if(!node.querySelector(`#audioOptions`).classList.contains(`d-none`)) node.querySelector(`#audioOptions`).classList.add(`d-none`)
            if(node.querySelector(`#videoOptions`).classList.contains(`d-none`)) node.querySelector(`#videoOptions`).classList.remove(`d-none`)
        }
    }

    const btnClick = (btn, i) => {
        if(typeof i != `number` || currentSelected == i) {
            buttonDisabledAnim(btn);
        } else {
            currentSelected = i;
            refreshQualityButtonSelection();
            saveOptionsAnimations.fadeOut(null, qualityButtonsDropdown, (i) => btnClick(btn, i), node).then(() => {
                modifyQualityButtonsDropdown();
                refreshOutputExt();
                saveOptionsAnimations.fadeIn(null, qualityButtonsDropdown, (i) => btnClick(btn, i), node).then(() => { })
            })
        }
    };

    const downloadBest = node.querySelector(`#downloadBest`);

    if(downloadBest) {
        const { downloadWithFFmpeg } = config;

        const bestQualityStr = downloadBest.innerHTML.split(`Quick Download`)[0] + `Full Quality*`;
        const possibleBestQualityStr = downloadBest.innerHTML.split(`Quick Download`)[0] + `Quick Download*`;
        const defaultStr = downloadBest.innerHTML.split(`Quick Download`)[0] + `Quick Download`;

        console.log(`downloadBest strings`, bestQualityStr, possibleBestQualityStr, defaultStr)
    
        if(hasFFmpeg && downloadWithFFmpeg && downloadBest && downloadBest.innerHTML != bestQualityStr) {
            downloadBest.innerHTML = bestQualityStr
            downloadBest.setAttribute(`title`, `The best video & audio quality (when applicable) will be downloaded simultaneously and merged together utilizing FFmpeg when necessary.\n\nIf FFmpeg is not present when the download begins, the best quality that contains both audio and video (when applicable) will be downloaded instead with yt-dlp, which will usually result in a lower quality on certain platforms.\n\nPlease note that downloading with FFmpeg may end up being slower than downloading with yt-dlp, as it would likely be downloading multiple streams at once. You can disable this in the settings through the "${config.strings.downloadWithFFmpeg}" option!`)
        } else if(hasFFmpeg && !downloadWithFFmpeg && downloadBest && downloadBest.innerHTML != possibleBestQualityStr) {
            downloadBest.innerHTML = possibleBestQualityStr
            downloadBest.setAttribute(`title`, `The option "${config.strings.downloadWithFFmpeg}" is disabled; the best quality that contains both audio and video (when applicable) will be downloaded instead with yt-dlp, which will usually result in a lower quality on certain platforms in comparison to downloading with FFmpeg (which will simultaneously download the best audio AND video format).`)
        } else if(downloadBest.innerHTML != defaultStr) {
            downloadBest.innerHTML = defaultStr
            if(downloadBest.hasAttribute(`title`)) downloadBest.removeAttribute(`title`);
        }
    }

    //highlightButton(downloadBest, colorScheme)
    if(downloadBest) downloadBest.onclick = () => btnClick(downloadBest, 0);
    if(node.querySelector(`#downloadBestAudio`)) node.querySelector(`#downloadBestAudio`).onclick = () => btnClick(node.querySelector(`#downloadBestAudio`), 1);
    if(node.querySelector(`#downloadBestVideo`)) node.querySelector(`#downloadBestVideo`).onclick = () => btnClick(node.querySelector(`#downloadBestVideo`), 2);

    node.querySelector(`#confirmDownload`).onclick = () => send({card, node, info, format: qualities[currentSelected] || qualities[0], overrideDownloadObj, centerURLBox});
}