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

const setDefaultSaveOptValues = (node, info) => {
    if(node.querySelector(`#formatConversionTextbox`)) {
        node.querySelector(`#formatConversionTextbox`).placeholder = `ext`;
    } else console.log(`no formatConversionTextbox`)

    if(node.querySelector(`#saveLocation`)) {
        console.log(`setting saveLocation values`)

        conversionOptions(node, info)

        if(info.entries && info.entries.length > 0) {
            if(!node.querySelector(`#saveLocation`).value.endsWith(navigator.platform.toLowerCase() == `win32` ? `\\` : `/`)) node.querySelector(`#saveLocation`).value += navigator.platform.toLowerCase() == `win32` ? `\\` : `/`
            node.querySelector(`#saveLocation`).value += info.title
        }
    } else console.log(`no saveLocation`)
};

const getQualityButtons = (node) => {
    if(node.querySelector(`#qualityButtons`)) {
        return node.querySelector(`#qualityButtons`)
    } else if(node.id == `qualityButtons`) {
        return node
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
    fadeIn: (btn, saveOptions, btnClick) => new Promise(res => {
        anime.remove(saveOptions)

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
        if(btn) anime({
            targets: btn.querySelector(`#downloadicon`),
            rotate: [`0deg`, `180deg`],
            duration: 500,
            easing: `easeOutExpo`
        })
    }),
    fadeOut: (btn, saveOptions, btnClick) => new Promise(res => {
        if(saveOptions.classList.contains(`d-none`)) return res()
        
        if(btn) btn.onclick = () => {}

        anime.remove(saveOptions);

        if(saveOptions.style.opacity < 0.35) {
            return res()
        } else {
            const { height } = saveOptions.getBoundingClientRect();
            anime({
                targets: saveOptions,
                maxHeight: [height, `0px`],
                opacity: `0%`,
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
            if(btn) anime({
                targets: btn.querySelector(`#downloadicon`),
                rotate: [`180deg`, `0deg`],
                duration: 500,
                easing: `easeOutExpo`
            })
        }
    })
};

const qualityButtons = ({node, card, info, overrideDownloadObj, centerURLBox, removeEntry}) => {
    console.log(`qualityButtons`, info)

    addMissingNodes(node);

    node = getQualityButtons(node);

    const formatConversionTextbox = node.querySelector(`#formatConversionTextbox`);

    const ffmpegOptions = node.querySelector(`#ffmpegOptions`);
    const convertDownload = node.querySelector(`#convertDownload`);
    const confirmDownload = node.querySelector(`#confirmDownload`);

    let qualities = [`bv*+ba/b`, `ba`, `bv`];

    let currentSelected = null;

    const defaultColors = {
        background: node.querySelector(`.btn`).style.background,
        color: node.querySelector(`.btn`).style.color,
    }

    formatConversionTextbox.placeholder = `ext`;

    let configSelectionMap = [`both`, `audio`, `video`]

    let refreshOutputExt = () => {
        console.log(`setting value to ${configSelectionMap[currentSelected]} / ${config.lastMediaConversionOutputs[configSelectionMap[currentSelected]]}`)
        formatConversionTextbox.value = config.lastMediaConversionOutputs[configSelectionMap[currentSelected]] || ``;
    }

    let refreshQualityButtonSelection = () => {
        node.querySelectorAll(`.btn`).forEach((btn, i) => {
            if(currentSelected == i) {
                btn.style.backgroundColor = `#000000`;
                btn.style.color = `#ffffff`;
            } else {
                btn.style.backgroundColor = defaultColors.background;
                btn.style.color = defaultColors.color;
            }
        });
    };

    const qualityButtonsDropdown = node.querySelector(`#saveOptions`) || listboxTemplate.querySelector(`#saveOptions`).cloneNode(true);
    if(!qualityButtonsDropdown.parentNode) node.appendChild(qualityButtonsDropdown);
    setDefaultSaveOptValues(qualityButtonsDropdown, info);
    node.appendChild(qualityButtonsDropdown);

    const saveLocation = node.querySelector(`#saveLocation`)

    saveLocation.value = `${config && config.saveLocation ? config.saveLocation : ``}`;

    if(info.entries && info.entries.length > 0) {
        if(!saveLocation.value.endsWith(`/`) && !saveLocation.value.endsWith(`\\`)) saveLocation.value += navigator.platform.toLowerCase() == `win32` ? `\\` : `/`
        saveLocation.value += info.title
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
        
        if(!ffmpegOptions.classList.contains(`d-none`)) {
            ffmpegOptions.classList.add(`d-none`);
        }

        if(convertDownload.style.width != `49%`) {
            anime.remove(convertDownload);
            anime.remove(confirmDownload);
            convertDownload.style.opacity = 1;
            convertDownload.style.width = `49%`;
            confirmDownload.style.width = `49%`;
            convertDownload.style.maxWidth = null;
        }

        if(ffmpegOptions.style.maxHeight) {
            anime.remove(ffmpegOptions);
            ffmpegOptions.style.maxHeight = null;
        }
    
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

    const btnClick = (i) => {
        currentSelected = i;
        refreshQualityButtonSelection();
        saveOptionsAnimations.fadeOut(null, qualityButtonsDropdown, btnClick).then(() => {
            modifyQualityButtonsDropdown();
            refreshOutputExt();
            saveOptionsAnimations.fadeIn(null, qualityButtonsDropdown, btnClick).then(() => { })
        })
    }

    node.querySelector(`#downloadBest`).onclick = () => btnClick(0);
    node.querySelector(`#downloadBestAudio`).onclick = () => btnClick(1);
    node.querySelector(`#downloadBestVideo`).onclick = () => btnClick(2);

    const send = () => {
        node.querySelectorAll(`.btn`).forEach(btn => btn.disabled = true);

        if(typeof removeEntry == `function`) removeEntry();

        /*
        if(info.resolution) node.querySelector(`#videoResolution`).placeholder = `Resolution (${info.resolution})`
        if(info.vbr) node.querySelector(`#videoBitrate`).placeholder = `Bitrate (${info.vbr}k)`
        
        if(info.asr) node.querySelector(`#audioSampleRate`).placeholder = `Sample Rate (${info.asr/1000}k)`
        if(info.abr) node.querySelector(`#audioBitrate`).placeholder = `Bitrate (${info.abr}k)`
        */

        let convertInfo = { ext: formatConversionTextbox.value };

        let convert = false;

        if(convertDownload.style.width != `49%`) {
            convert = true;

            node.querySelector(`#audioOptions`).childNodes.forEach(n => {
                if(n && n.placeholder && n.id) convertInfo[n.id] = n.value;
            });

            node.querySelector(`#videoOptions`).childNodes.forEach(n => {
                if(n && n.placeholder && n.id) convertInfo[n.id] = n.value;
            });
        };

        console.log(`convert? ${convert}`, convertInfo)

        if(info.entries) {
            startDownload(card || node, {
                entries: info.entries.map(e => {
                    return Object.assign({}, {
                        url: e.webpage_url || e.url,
                        format: qualities[currentSelected] || qualities[0],
                        ext: convert ? null : formatConversionTextbox.value,
                        convert: convert ? convertInfo : null,
                        filePath: node.querySelector(`#saveLocation`).value || null,
                        info: e
                    }, overrideDownloadObj && typeof overrideDownloadObj == `object` ? overrideDownloadObj : {})
                }),
                info: Object.assign({}, info, { formats: null, entries: null }),
            });
        } else {
            startDownload(card || node, Object.assign({}, {
                url: info.webpage_url || info.url,
                format: qualities[currentSelected] || qualities[0],
                ext: convert ? null : formatConversionTextbox.value,
                convert: convert ? convertInfo : null,
                filePath: node.querySelector(`#saveLocation`).value || null,
                info: info
            }, overrideDownloadObj && typeof overrideDownloadObj == `object` ? overrideDownloadObj : {}))
        }

        if(centerURLBox) centerURLBox(false);
    }

    node.querySelector(`#confirmDownload`).onclick = () => send();
}