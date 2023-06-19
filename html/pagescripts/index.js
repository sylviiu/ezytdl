const mainContainer = document.getElementById(`mainContainer`);

const searchBoxHeights = () => [`${window.innerHeight - 80}px`, `225px`]

const urlBox = document.getElementById(`urlBox`);
const innerUrlBox = document.getElementById(`innerUrlBox`);

const searchSelectionBox = document.getElementById(`searchSelectionBox`);
const innerSearchSelectionBox = document.getElementById(`innerSelectionBox`);

const background = document.getElementById(`background`);

const input = document.getElementById(`urlInput`);
const button = document.getElementById(`urlEnter`);

const formatListTemplate = listbox.querySelector(`#formatList`).cloneNode(true);
const formatCard = document.getElementById(`formatCard`).cloneNode(true);

const listboxTemplate = document.getElementById(`listbox`).cloneNode(true);
const listboxParent = document.getElementById(`listbox`).parentElement;

const advancedOptions = document.getElementById(`advancedOptions`);

const extraArguments = document.getElementById(`extraArguments`);

if(!config.advanced) advancedOptions.classList.add(`d-none`)

listboxTemplate.querySelector(`#formatCard`).parentElement.removeChild(listboxTemplate.querySelector(`#formatCard`));

listboxParent.removeChild(document.getElementById(`listbox`));

const waves = generateWaves();

waves.style.opacity = 0;

document.body.insertBefore(waves, document.body.firstChild);

const wavesHeight = waves.getBoundingClientRect().height;

console.log(`wavesHeight`, wavesHeight)

anime({
    targets: document.body,
    backgroundColor: `rgb(${systemColors.darker.r}, ${systemColors.darker.g}, ${systemColors.darker.b})`,
    duration: 1000,
    easing: `easeInCirc`
})

waves.style.bottom = (wavesHeight * -1) + `px`

const wavesAnims = {
    fadeIn: () => {
        anime.remove(waves)

        anime({
            targets: waves,
            opacity: 1,
            bottom: 0,
            duration: 4000,
            easing: `easeOutCirc`
        })
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

        /*anime.remove(document.body)

        anime({
            targets: document.body,
            backgroundColor: `rgb(10,10,10)`,
            duration: 1000,
            easing: `easeOutCirc`
        })*/
    }
}

let changesMadeToInput = true;

let currentInfo = null;

mainQueue.formatStatusUpdate((content) => document.getElementById(`statusText`).innerHTML = content);

let progressObj = null;

mainQueue.formatStatusPercent(val => {
    const current = val[0];
    const total = val[1];

    if(progressObj) progressObj.setProgress((val[0]/val[1])*100, `(${current}/${total})`);
})

let selectedSearch = null;

let resultsVisible = false;

let existingCenterBoxPromise = null;
let centerURLBox = () => existingCenterBoxPromise ? existingCenterBoxPromise : new Promise(r => r(false));

const runSearch = async (url, initialMsg, func) => {
    system.hasFFmpeg().then(has => {
        hasFFmpeg = has;
    });
    
    document.getElementById(`statusText`).innerHTML = initialMsg || `Fetching info...`;
    if(document.getElementById(`statusText`).classList.contains(`d-none`)) document.getElementById(`statusText`).classList.remove(`d-none`);

    progressObj = addProgressBar(document.getElementById(`urlBox`), `80%`);

    console.log(`${initialMsg || `running search for`}: ${url}`)

    let info = null;

    centerURLBox = (removeListbox, duration) => {
        if(existingCenterBoxPromise) {
            console.log(`centerURLBox: existing promise found; returning...`)
            return existingCenterBoxPromise;
        } else {
            console.log(`centerURLBox: no existing promise found; creating new promise...`)
            const promise = new Promise(async resolvPromise => {
                const res = (...args) => {
                    console.log(`centerURLBox: promise resolved; args:`, args)
                    resolvPromise(...args);
                }
    
                console.log(`centerURLBox called; resultsVisible: ${resultsVisible}; doing anything? ${resultsVisible != false}`);
            
                if(!resultsVisible) return res(false);
            
                resultsVisible = false;
            
                document.body.style.overflowY = `hidden`;
            
                currentInfo = null;
            
                window.scrollTo(0, 0);
            
                duration = Number(duration) || 600;
            
                const growUrlBox = (d) => {
                    currentInfo = null;
        
                    if(background.style.opacity != 0) {
                        anime.remove(background)
                
                        anime({
                            targets: background,
                            opacity: 0,
                            scale: 1.05,
                            duration: 1000,
                            easing: `easeOutExpo`,
                        })
                    }
        
                    anime({
                        targets: urlBox,
                        height: searchBoxHeights().reverse(),
                        duration: d || duration,
                        easing: `easeOutCirc`,
                        complete: () => {
                            if(document.getElementById(`listbox`)) listboxParent.removeChild(document.getElementById(`listbox`));
            
                            urlBox.style.height = `calc(100vh - 80px)`;
        
                            res(true);
                        }
                    });
                }
            
                if(config.reduceAnimations) {
                    if(removeListbox && document.getElementById(`listbox`)) {
                        anime({
                            targets: document.getElementById(`listbox`),
                            opacity: [1, 0],
                            duration: duration/2,
                            easing: `easeOutCirc`,
                            complete: () => {
                                if(document.getElementById(`listbox`)) listboxParent.removeChild(document.getElementById(`listbox`));
                                growUrlBox(duration/2);
                            }
                        });
                    } else growUrlBox(duration/2);
                } else {
                    growUrlBox();
                }
            
                if(config.disableAnimations) {
                    wavesAnims.fadeIn();
                } else setTimeout(() => wavesAnims.fadeIn(), duration/10)
            });
            existingCenterBoxPromise = promise;
            promise.then(() => existingCenterBoxPromise = null)
            return promise;
        }
    }

    const parseInfo = async () => {
        console.log(`parseInfo: started`)

        input.value = url;

        resultsVisible = true;
        changesMadeToInput = false;

        const listbox = listboxTemplate.cloneNode(true);
        
        if(listbox.classList.contains(`d-none`)) listbox.classList.remove(`d-none`);
        
        const formatList = listbox.querySelector(`#formatList`);

        currentInfo = info;
        
        document.body.style.overflowY = `scroll`;

        if(!info || info.error) {
            console.log(`Errored. Doing nothing.`)

            progressObj.remove();
            progressObj = null;

            refreshSelectionBox();
        } else {
            listbox.querySelector(`#mediaTitle`).innerHTML = ``;

            let type = info.extractor_key || info.extractor || info.webpage_url_domain;
            let icon;

            const setIcon = (name, original, extra) => {
                console.log(`checking if icon "fab fa-${name}" exists (from ${original}) -- extra: ${extra || `(none)`}`);
                if(faIconExists(`fab`, name)) {
                    console.log(`icon exists! setting icon...`)
                    icon = document.createElement(`i`);
                    icon.style.fontWeight = `normal`;
                    icon.style.marginRight = `12px`;
                    icon.classList.add(`fab`);
                    icon.classList.add(`fa-${name}`);
                    if(typeof extra == `string`) iconExtra = `| ` + extra + `, `;
                    return true;
                } else {
                    console.log(`icon does not exist!`)
                    return false;
                }
            }

            if(!icon && info.webpage_url_domain) setIcon(info.webpage_url_domain.split(`.`).slice(-2, -1)[0].toLowerCase(), `webpage_url_domain`);
            if(!icon && info.extractor) setIcon(info.extractor.split(`:`)[0].toLowerCase(), `extractor`, info.extractor.split(`:`).slice(1).map(s => s[0].toUpperCase() + s.slice(1)).join(` `));
            if(!icon) setIcon(type.toLowerCase(), type);
            if(!icon) setIcon(type.split(/(?=[A-Z])/)[0].toLowerCase(), `"${type}" split by capital letters`, type.split(/(?=[A-Z])/).slice(1).join(``));
            if(!icon && info.webpage_url_domain && info.webpage_url_domain.split(`.`).slice(-2, -1)[0].toLowerCase().endsWith(`app`)) setIcon(info.webpage_url_domain.split(`.`).slice(-2, -1)[0].toLowerCase().slice(0, -3), `webpage_url_domain (without app at end)`);

            if(icon) listbox.querySelector(`#mediaTitle`).appendChild(icon);

            listbox.querySelector(`#mediaTitle`).innerHTML += `${info.title}`;

            const updateMetadata = async (parse) => {
                if(parse) info = await mainQueue.parseInfo(info);

                let afterType = ``;
                if(info.formats) afterType += ` entry`
                if(info.creator || info.uploader || info.channel) afterType += ` by ${info.creator || info.uploader || info.channel}`;
                
                let results;

                if(info.entries) results = info.entries.length + ` entr${info.entries.length == 1 ? `y` : `ies`}`
                else if(info.formats) results = info.formats.length + ` format${info.formats.length == 1 ? `` : `s`}`

                listbox.querySelector(`#mediaSubtext`).innerHTML = ((type || iconExtra) + afterType + (results ? (type || iconExtra || afterType ? ` | ` : ``) + `${results}` : ``)).trim();
    
                if(info.duration && info.duration.string && info.duration.units.ms) listbox.querySelector(`#mediaSubtext`).innerHTML += ` | ${info.duration.string}`;
            };

            updateMetadata();

            let thumbnail = null;

            if(info.thumbnails && info.thumbnails.length > 0) thumbnail = info.thumbnails[info.thumbnails.length - 1];
            if(info.entries && info.entries.find(o => o.thumbnails && o.thumbnails.length > 0)) thumbnail = info.entries.find(o => o.thumbnails && o.thumbnails.length > 0).thumbnails[info.entries.find(o => o.thumbnails && o.thumbnails.length > 0).thumbnails.length - 1];

            if(thumbnail) {
                console.log(`thumbnail:`, thumbnail);

                const img = new Image();

                img.addEventListener(`load`, () => {
                    if(currentInfo.webpage_url == info.webpage_url) {
                        document.getElementById(`background`).style.backgroundImage = `url(${thumbnail.url})`;

                        anime.remove(background)

                        anime({
                            targets: background,
                            opacity: [0, 0.15],
                            scale: [1, 1.15],
                            duration: 4000,
                            easing: `easeOutExpo`
                        })
                    }
                });

                img.src = thumbnail.url;
            }

            console.log(info)
            
            qualityButtons({ card: listbox, node: listbox.querySelector(`#qualityButtons`), info, centerURLBox: info.entries ? centerURLBox : () => {} });

            let parseProgress = addProgressBar(document.getElementById(`urlBox`), `80%`);

            if(info.is_live) listbox.querySelector(`#qualityButtons`).classList.add(`d-none`);

            const appendCard = (card) => {
                /*const convertDownload = card.querySelector(`#convertDownload`);
                if(!convertDownload || convertDownload.classList.contains(`d-none`)) {
                    if(card.querySelector(`#confirmDownload`)) highlightButton(card.querySelector(`#confirmDownload`))
                } else {
                    const originalConvertClick = convertDownload.onclick;

                    const originalConvertDownloadBG = convertDownload.style.backgroundColor;

                    convertDownload.onclick = () => {
                        convertDownload.style.backgroundColor = originalConvertDownloadBG;
                        originalConvertClick();
                        highlightButton(card.querySelector(`#confirmDownload`))
                    }
                    
                    highlightButton(convertDownload);
                };*/
                if(card.querySelector(`#confirmDownload`)) highlightButton(card.querySelector(`#confirmDownload`))

                formatList.appendChild(card);
            }

            if(info.entries) {
                if(info.entries.filter(e => e.entries).length == info.entries.length || info.entries.length == 0) {
                    listbox.querySelector(`#qualityButtons`).classList.add(`d-none`);
                }

                for (const i in info.entries) {
                    const entry = info.entries[i];

                    parseProgress.setProgress((i/info.entries.length)*100, `Parsing entry ${i}/${info.entries.length}`);

                    const card = formatCard.cloneNode(true);

                    card.querySelector(`#formatMetaList`).classList.add(`d-none`);

                    card.querySelector(`#buttonsDiv`).style.minHeight = `36px`;

                    card.querySelector(`#mediaIcons`).style.width = `24px`
                    card.querySelector(`#mediaIcons`).style.minWidth = `24px`
                    card.querySelector(`#mediaIcons`).style.maxWidth = `24px`

                    card.querySelector(`#audioIcon`).classList.add(`d-none`);
                    card.querySelector(`#videoIcon`).classList.add(`d-none`);

                    if(entry.webpage_url || entry.url) {
                        card.querySelector(`#linkIcon`).classList.remove(`d-none`);
                        card.querySelector(`#nameDiv`).style.cursor = `pointer`;
                        card.querySelector(`#nameDiv`).addEventListener(`click`, () => {
                            location.href = entry.webpage_url || entry.url
                        })
                    } else card.querySelector(`#fileIcon`).classList.remove(`d-none`);

                    if(!entry.title) entry.title = entry.webpage_url;
                    if(!entry.title) entry.title = entry.url;

                    card.querySelector(`#formatName`).innerHTML = entry.title;

                    if(entry.creator || entry.uploader || entry.channel) {
                        card.querySelector(`#formatSubtext`).innerHTML = `${entry.creator || entry.uploader || entry.channel}`;
                        if(entry.released) {
                            card.querySelector(`#formatSubtext`).innerHTML += ` | ${entry.released.string.split(`,`)[0] + ` ago`}`;
                        }
                        card.querySelector(`#formatSubtext`).classList.remove(`d-none`);
                    } else if(entry.released) {
                        card.querySelector(`#formatSubtext`).innerHTML += ` | ${entry.released.string.split(`,`)[0] + ` ago`}`;
                        card.querySelector(`#formatSubtext`).classList.remove(`d-none`);
                    }

                    if(entry.duration) {
                        card.querySelector(`#fileFormat`).innerHTML = `${entry.duration.timestamp}`;
                    } else {
                        card.querySelector(`#fileFormat`).classList.add(`d-none`)
                    }

                    //card.querySelector(`#saveOptions`).innerHTML = ``;

                    const removeEntry = () => {
                        const thisIndex = info.entries.findIndex(o => (o.id || o.webpage_url || o.url) == (entry.id || entry.webpage_url || entry.url));
                        if(thisIndex != -1) {
                            console.log(`Removing index ${thisIndex}`)
                            info.entries.splice(thisIndex, 1);
                            updateMetadata(true);
                        } else console.log(`Failed to find index for ${entry.id || entry.webpage_url || entry.url}`)
                    }

                    //console.log(`innerFormatCard`, card.querySelector(`#innerFormatCard`))

                    card.querySelector(`#pausePlayButton`).classList.remove(`d-none`);
                    card.querySelector(`#pausePlayButton`).classList.add(`d-flex`);
                    card.querySelector(`#pauseicon`).classList.add(`d-none`);
                    card.querySelector(`#crossicon`).classList.remove(`d-none`);

                    card.querySelector(`#pausePlayButton`).onclick = () => removeCardAnim(card, removeEntry);

                    const nested = (entry.entries || func == `search`) ? true : false;

                    if(nested) {
                        if(entry.entries) card.querySelector(`#formatName`).innerHTML += ` (${entry.entries.length})`;

                        card.querySelector(`#downloadicon`).style.transform = `rotate(270deg)`;
                        // make arrow point right
                    
                        //highlightButton(card.querySelector(`#formatDownload`))

                        card.querySelector(`#formatDownload`).onclick = () => {
                            input.disabled = false;
                            button.disabled = false;
                            
                            if(config.disableAnimations) {
                                input.value = entry.webpage_url || entry.url;
                                runSearch(input.value, `Fetching info...`, `getInfo`)
                            } else {
                                const newCard = popout(card);
    
                                const bounding = card.getBoundingClientRect();

                                centerURLBox(null, 900);
                                runSearch(entry.url, `Fetching info...`, `getInfo`)
    
                                window.scrollTo(0, 0);
                                
                                anime({
                                    targets: [newCard.querySelector(`#formatCardBG`), newCard.querySelector(`#innerFormatCard`)],
                                    easing: `easeOutCirc`,
                                    borderRadius: `${Math.floor(bounding.height, bounding.width)/2}px`,
                                    duration: 500,
                                })
    
                                anime({
                                    targets: newCard,
                                    top: (window.innerHeight - 90) + `px`,
                                    easing: `easeOutCirc`,
                                    borderRadius: `${Math.floor(bounding.height, bounding.width)/2}px`,
                                    duration: 400,
                                    complete: () => {
                                        console.log(`throwing node`)
                                        throwNode(newCard, innerUrlBox, true, true).then(() => {
                                            console.log(`parseInfo: node hit`)
                                            //input.value = entry.webpage_url || entry.url;
                                            //runSearch(input.value, `Fetching info...`, `getInfo`)
                                        })
                                    }
                                })
                            }
                        }
                    } else {
                        let fadeIn = () => null;
                        let fadeOut = () => null;

                        let visible = false;

                        let btnClick = () => {
                            if(!visible) {
                                fadeIn();
                            } else {
                                fadeOut();
                            }

                            visible = !visible;
                        };

                        card.querySelector(`#formatDownload`).onclick = () => btnClick();

                        card.querySelector(`#formatDownload`).classList.remove(`d-none`)

                        if(entry.is_live) {                            
                            const saveOptions = listboxTemplate.querySelector(`#saveOptions`).cloneNode(true)
        
                            card.querySelector(`#innerFormatCard`).appendChild(saveOptions)
    
                            const confirmDownload = () => {
                                saveOptionsAnimations.fadeOut(card.querySelector(`#confirmDownload`), saveOptions);
        
                                card.querySelector(`#confirmDownload`).disabled = true;
        
                                card.style.opacity = 0.5;
        
                                startDownload(card, getSaveOptions(card, Object.assign({}, info, { entries: null }, entry)))
                            }

                            card.querySelector(`#confirmDownload`).onclick = () => confirmDownload();

                            fadeIn = () => saveOptionsAnimations.fadeIn(card.querySelector(`#formatDownload`), saveOptions, btnClick);
                            fadeOut = () => saveOptionsAnimations.fadeOut(card.querySelector(`#formatDownload`), saveOptions, btnClick);
                        } else {
                            const newDiv = listbox.querySelector(`#qualityButtons`).cloneNode(true);
        
                            newDiv.style.padding = `0px`;
                            newDiv.style.minWidth = `100%`;
                            newDiv.style.removeProperty(`background`);
        
                            const innerQualityButtons = newDiv.querySelector(`#innerQualityButtons`);
        
                            innerQualityButtons.style.minWidth = `100%`;

                            newDiv.classList.add(`d-none`)
                            
                            card.querySelector(`#innerFormatCard`).appendChild(newDiv);

                            fadeIn = () => saveOptionsAnimations.fadeIn(card.querySelector(`#formatDownload`), newDiv, btnClick);
                            fadeOut = () => saveOptionsAnimations.fadeOut(card.querySelector(`#formatDownload`), newDiv, btnClick);

                            qualityButtons({ node: card.querySelector(`#innerFormatCard`), info: entry, card, removeEntry: () => removeEntry() });
                        }

                        //console.log(`running conversionOptions`)
    
                        conversionOptions(card, entry)
                    }

                    let visible = false;

                    const onVisibility = () => {
                        if(!visible) {
                            visible = true;

                            if(card && card.parentElement) {
                                console.log(`card ${entry.id || entry.webpage_url || entry.url} visibility event`)
    
                                if(entry.thumbnails && entry.thumbnails.length > 0) {
                                    const thumbnail = entry.thumbnails[entry.thumbnails.length - 1];
                    
                                    console.log(`thumbnail:`, thumbnail);
                    
                                    const img = new Image();
                    
                                    img.addEventListener(`load`, () => {
                                        if(card && card.parentElement) {
                                            console.log(`image loaded! setting bg...`)

                                            const formatBG = card.querySelector(`#formatCardBG`)
            
                                            formatBG.style.backgroundImage = `url(${thumbnail.url})`;
                    
                                            anime.remove(formatBG)
                    
                                            anime({
                                                targets: formatBG,
                                                opacity: [0, 0.35],
                                                duration: 1000,
                                                easing: `easeOutQuad`
                                            })
                                        }
                                    });
                    
                                    img.src = thumbnail.url;
                                }
                            }
                        }
                    };

                    const observer = new IntersectionObserver((entries) => {
                        if(entries[0].isIntersecting) onVisibility();
                    }, { threshold: [0] });

                    observer.observe(card);

                    appendCard(card);

                    if(i % 25 == 0) await new Promise((resolve) => setTimeout(resolve, 1));
                }
            };
            
            if(info.formats) {
                qualityButtons({ node: listbox, info });

                info.formats = info.formats.map(format => {
                    if(format.audio_ext != `none` || format.acodec != `none` || format.asr || format.audio_channels) {
                        format.audio = true;
                    } else {
                        format.audio = false;
                    }

                    if(format.aspect_ratio || format.fps || format.height || format.width || format.resolution != `audio only` || format.vcodec != `none` || format.video_ext != `none`) {
                        format.video = true;
                    } else {
                        format.video = false;
                    };

                    return format;
                }).sort((a, b) => {
                    if(a.audio && a.video) {
                        return -1;
                    } else if(b.audio && b.video) {
                        return 1;
                    } else if(a.audio && !a.video) {
                        return -1;
                    } else if(b.audio && !b.video) {
                        return 1;
                    } else if(a.video && !a.audio) {
                        return -1;
                    } else if(b.video && !b.audio) {
                        return 1;
                    } else {
                        return 0;
                    }
                });

                if(info.formats.filter(f => f.audio).length == 0 && listbox.querySelector(`#downloadBestAudio`)) listbox.querySelector(`#downloadBestAudio`).classList.add(`d-none`);
                if(info.formats.filter(f => f.video).length == 0 && listbox.querySelector(`#downloadBestVideo`)) listbox.querySelector(`#downloadBestVideo`).classList.add(`d-none`);
                
                for (const i in info.formats) {
                    const format = info.formats[i];

                    parseProgress.setProgress((i/info.formats.length)*100, `Parsing format ${i}/${info.formats.length}`);

                    //console.log(format)
                    const formatDownloadType = format.audio && format.video ? `both` : format.audio && !format.video ? `audio` : `video`;

                    const card = formatCard.cloneNode(true);

                    const saveOptions = listboxTemplate.querySelector(`#saveOptions`).cloneNode(true)

                    card.querySelector(`#innerFormatCard`).appendChild(saveOptions)

                    const formatName = card.querySelector(`#formatName`);
                    const formatSubtext = card.querySelector(`#formatSubtext`);

                    const list = card.querySelector(`#formatMetaList`);

                    const listMetaItems = {
                        video: list.querySelector(`#formatMetaVideoItem`).cloneNode(true),
                        audio: list.querySelector(`#formatMetaAudioItem`).cloneNode(true)
                    }

                    list.querySelector(`#formatMetaVideoItem`).remove();
                    list.querySelector(`#formatMetaAudioItem`).remove();

                    const tags = formatToTags(format)

                    formatName.innerHTML = tags.format;
                    if(tags.filesize) format.innerHTML += ` (${tags.filesize})`;
                    if(tags.drm) format.innerHTML += ` (DRM)`;

                    for (type of Object.keys(tags.meta)) {
                        console.log(`appending ${type} meta for ${tags.format}`)

                        if(listMetaItems[type]) {
                            for (key of Object.keys(tags.meta[type])) {
                                if(tags.meta[type][key] != `none`) {
                                    console.log(`appending ${key} meta with value ${tags.meta[type][key]}`)

                                    const item = listMetaItems[type].cloneNode(true);

                                    item.querySelector(`#txt`).innerHTML = key + `: ` + tags.meta[type][key];

                                    list.appendChild(item);
                                }
                            }
                        } else {
                            console.log(`no ${type} list item found`)
                        }
                    };

                    if(tags.extra.length > 0) {
                        card.querySelector(`#formatTags`).classList.remove(`d-none`);
                        card.querySelector(`#formatTags`).innerHTML = tags.extra.join(` | `);
                    }

                    card.querySelector(`#fileFormat`).innerHTML = format.ext;

                    if(format.audio) {
                        card.querySelector(`#audioIcon`).style.opacity = `100%`;
                    } else {
                        saveOptions.querySelector(`#audioOptions`).classList.add(`d-none`)
                        card.querySelector(`#audioIcon`).style.opacity = `35%`;
                    }

                    if(format.video) {
                        card.querySelector(`#videoIcon`).style.opacity = `100%`;
                        //card.querySelector(`#formatConversionTextbox`).classList.add(`d-none`);
                    } else {
                        card.querySelector(`#videoIcon`).style.opacity = `35%`;
                        saveOptions.querySelector(`#videoOptions`).classList.add(`d-none`)
                    }

                    card.querySelector(`#formatConversionTextbox`).placeholder = `${format.ext}`;
                    //card.querySelector(`#saveLocation`).value = `${config && config.saveLocation ? config.saveLocation : `{default save location}`}`;
                    card.querySelector(`#basedir`).innerText = `${config && config.saveLocation ? config.saveLocation : `Save Location`}`;

                    if(config.lastMediaConversionOutputs[formatDownloadType]) card.querySelector(`#formatConversionTextbox`).value = config.lastMediaConversionOutputs[formatDownloadType];

                    const saveOptionsIcon = card.querySelector(`#downloadicon`)

                    const btn = card.querySelector(`#formatDownload`);
                    
                    const confirmDownload = () => {
                        saveOptionsAnimations.fadeOut(btn, saveOptions, btnClick);

                        btn.disabled = true;

                        if(card.querySelector(`#formatConversionTextbox`).value != config.lastMediaConversionOutputs[formatDownloadType]) {
                            let j = {};

                            j[formatDownloadType] = card.querySelector(`#formatConversionTextbox`).value;
                        }

                        card.style.opacity = 0.5;

                        console.log(format.format_id)

                        startDownload(card, getSaveOptions(card, Object.assign({}, info, format)))
                    }

                    //card.querySelector(`#convertDownload`).parentElement.removeChild(card.querySelector(`#convertDownload`));
                    //card.querySelector(`#confirmDownload`).style.width = `100%`

                    card.querySelector(`#conversionDiv`).appendChild(card.querySelector(`#formatConversionTextbox`));

                    conversionOptions(card, format);
                    
                    card.querySelector(`#confirmDownload`).onclick = () => confirmDownload();

                    const btnClick = () => {
                        if(saveOptions.classList.contains(`d-none`)) {
                            saveOptionsAnimations.fadeIn(btn, saveOptions, btnClick);
                        } else {
                            saveOptionsAnimations.fadeOut(btn, saveOptions, btnClick);
                        }
                    }

                    btn.onclick = () => btnClick()

                    appendCard(card);

                    if(i % 25 == 0) await new Promise((resolve) => setTimeout(resolve, 1));
                }
            }

            wavesAnims.fadeOut();

            anime({
                targets: urlBox,
                height: searchBoxHeights(),
                duration: 300,
                easing: `easeOutCirc`,
                complete: () => {
                    if(!listbox.parentElement) {
                        listbox.style.opacity = 0;
                        listboxParent.appendChild(listbox);
                        anime({
                            targets: listbox,
                            opacity: 1,
                            duration: 300,
                            easing: `easeOutExpo`
                        })
                    }
                }
            });

            if(!config.reduceAnimations && !config.disableAnimations) listboxParent.appendChild(listbox);

            if(typeof parseProgress != `undefined` && parseProgress) {
                parseProgress.remove();
                parseProgress = null;
            }

            if(typeof progressObj != `undefined` && progressObj) {
                progressObj.remove();
                progressObj = null;
            }
        }
    
        input.disabled = false;
        button.disabled = false;
    }

    let parse = false;

    let opt = {
        query: url,
        extraArguments: extraArguments.value || ``
    };

    if(func == `search`) {
        if(selectedSearch) opt.from = selectedSearch;
        if(parseInt(resultsCountInput.value)) opt.count = parseInt(resultsCountInput.value);
    }

    deselectAllSearchBtns();

    console.log(`selectionBox / hiding from parseinfo`)
    selectionBox.hide(false, true);

    const runParse = (from) => {
        console.log(`parseInfo: check completed: ${from}`)
        if(parse) {
            parseInfo();
        } else {
            parse = true;
        }
    }

    mainQueue[func || `getInfo`](opt).then(data => {
        info = data;

        console.log(`info received`)

        runParse(`queue function`)
    })
    
    input.disabled = true;
    button.disabled = true;

    if(!document.getElementById(`errorMsg`).classList.contains(`d-none`)) {
        document.getElementById(`errorMsg`).classList.add(`d-none`);
    }

    centerURLBox(true).then(() => runParse(`centerURLBox`));
}

const resultsCountInput = document.getElementById(`resultsCountInput`);

const setSearchBtn = (btn, enabled, noAnim) => {
    anime.remove(btn)
    let duration = noAnim ? 0 : 500;
    if(enabled) {
        highlightButton(btn);
        btn.style.color = `rgb(0,0,0)`;
        anime({
            targets: btn,
            scale: 1.15,
            duration: duration,
            easing: `easeOutExpo`
        })
    } else {
        btn.style.backgroundColor = `rgb(255,255,255,0.05)`;
        btn.style.color = `rgb(255,255,255)`;
        anime({
            targets: btn,
            scale: 1,
            duration: duration,
            easing: `easeOutExpo`
        })
    }
};

const deselectAllSearchBtns = () => {
    extraArguments.value = ``;

    innerSearchSelectionBox.childNodes.forEach(c => {
        selectedSearch = null;
        if(c.classList.contains(`btn`)) {
            setSearchBtn(c, false, true);
            c.onclick = () => {
                console.log(`clicked search btn ${c.id}`)
                setCurrentSearch(c)
            }
        }
    })
}

let selectonBoxShowing = false;

//const selectionBoxHeight = searchSelectionBox.getBoundingClientRect().height;
const selectonBoxMargin = searchSelectionBox.style.marginTop;

//console.log(`height: ${selectionBoxHeight}, margin: ${selectonBoxMargin}`)

const selectionBox = {
    show: (noAnim) => {
        if(selectonBoxShowing) return;
        selectonBoxShowing = true;
        console.log(`selectionBox / showing search box`)

        const run = (node) => {
            console.log(`selectionBox / show / node id: ${node.id}`)

            if(node.classList.contains(`d-none`)) node.classList.remove(`d-none`)
            anime.remove(node);

            const currentHeight = node.style.height;

            node.style.height = null;
            
            const height = node.getBoundingClientRect().height;

            node.style.height = currentHeight;

            anime({
                targets: node,
                height: height,
                marginTop: selectonBoxMargin,
                top: 0,
                opacity: 1,
                duration: noAnim ? 0 : 500,
                easing: `easeOutExpo`
            });
        };

        run(searchSelectionBox);
        if(config.advanced) run(advancedOptions);
    },
    hide: (noAnim, hideAdvanced) => {
        if(!selectonBoxShowing && !hideAdvanced) return;
        selectonBoxShowing = false;
        console.log(`selectionBox / hiding search box (hideadvanced: ${hideAdvanced})`)

        const run = (node) => {
            console.log(`selectionBox / hide / node id: ${node.id}`)
            anime.remove(node);
            anime({
                targets: node,
                height: 0,
                marginTop: 0,
                top: -node.getBoundingClientRect().height,
                opacity: 0,
                duration: noAnim ? 0 : 500,
                easing: `easeOutExpo`,
                complete: () => {
                    if(!node.classList.contains(`d-none`)) node.classList.add(`d-none`)
                }
            });
        }

        run(searchSelectionBox);
        if(hideAdvanced && config.advanced) run(advancedOptions);
    }
}

deselectAllSearchBtns();

const setCurrentSearch = (btn) => {
    changesMadeToInput = true;
    centerURLBox(true);
    console.log(`current search: ${selectedSearch}, new id: ${btn.id}`)
    if(btn.id == selectedSearch) return;
    console.log(`changing`)
    if(innerSearchSelectionBox.querySelector(`#${selectedSearch}`)) setSearchBtn(innerSearchSelectionBox.querySelector(`#${selectedSearch}`), false);
    setSearchBtn(btn, true);
    selectedSearch = btn.id;
    innerSearchSelectionBox.childNodes.forEach(c => {
        if(c.classList.contains(`btn`) && !c.id == btn.id) {
            setSearchBtn(c, false, true);
        }
    })
};

const genericUrlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

const processURL = () => {
    const url = input.value;

    if(url.length > 0) {        
        console.log (`clicc`, url)
    
        const match = `${url}`.split(`?`)[0].match(genericUrlRegex);
    
        console.log (`match`, match)
    
        if(match) {
            runSearch(url, `Fetching info...`, `getInfo`)
        } else {
            runSearch(url, `Running search...`, `search`)
        }
    }
}

button.onclick = () => processURL();

const refreshSelectionBox = () => {
    if(!progressObj) {
        selectionBox.show(null, false);
        if(input.value.match(genericUrlRegex) && input.value.length > 0) {
            console.log(`matches url`)
            selectionBox.hide(null, false);
        } else {
            console.log(`does not match url`)
            selectionBox.show(null, false);
        }
    }
}

const inputs = [input, extraArguments];

inputs.forEach(inp => {
    inp.addEventListener(`input`, () => {
        changesMadeToInput = true;
        centerURLBox(true);
        refreshSelectionBox();
    });
    
    inp.addEventListener(`click`, refreshSelectionBox);
    inp.addEventListener(`blur`, () => setTimeout(() => !changesMadeToInput ? selectionBox.hide(null, true) : null, 100));
    //inp.addEventListener(`focus`, () => !changesMadeToInput ? selectionBox.hide(null, true) : null);
    
    inp.addEventListener(`keyup`, (e) => {
        if((e.key == `Enter` || e.keyCode == 13) && !input.disabled) processURL();
    });
})
    
resultsCountInput.addEventListener(`keyup`, (e) => {
    if(e.key == `Enter` || e.keyCode == 13) processURL();
});

setTimeout(() => wavesAnims.fadeIn(), 50)

changelog.check();

if(window.location.search.slice(1)) {
    const str = window.location.search.slice(1);
    history.pushState({ page: 1 }, "introAnimation", window.location.href.split(`?`)[0]);
    input.value = str;
    processURL();
};