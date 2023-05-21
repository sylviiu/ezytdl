const mainContainer = document.getElementById(`mainContainer`);

const searchBoxHeights = () => [`${window.innerHeight - 80}px`, `225px`]

const urlBox = document.getElementById(`urlBox`);

const background = document.getElementById(`background`);

const input = document.getElementById(`urlInput`);
const button = document.getElementById(`urlEnter`);

const formatListTemplate = listbox.querySelector(`#formatList`).cloneNode(true);
const formatCard = document.getElementById(`formatCard`).cloneNode(true);

const listboxTemplate = document.getElementById(`listbox`).cloneNode(true);
const listboxParent = document.getElementById(`listbox`).parentElement;

listboxTemplate.querySelector(`#formatCard`).parentElement.removeChild(listboxTemplate.querySelector(`#formatCard`));

listboxParent.removeChild(document.getElementById(`listbox`));

let currentInfo = null;

mainQueue.formatStatusUpdate((content) => document.getElementById(`statusText`).innerHTML = content);

let progressObj = null;

mainQueue.formatStatusPercent(val => {
    const current = val[0];
    const total = val[1];

    if(progressObj) progressObj.setProgress((val[0]/val[1])*100, `(${current}/${total})`);
})

const runSearch = async (url, initialMsg, func) => {
    document.getElementById(`statusText`).innerHTML = initialMsg || `Fetching info...`;
    if(document.getElementById(`statusText`).classList.contains(`d-none`)) document.getElementById(`statusText`).classList.remove(`d-none`);

    progressObj = addProgressBar(document.getElementById(`urlBox`), `80%`);

    console.log(`${initialMsg || `running search for`}: ${url}`)

    const centerURLBox = (removeListbox, checkParse) => {
        document.body.style.overflowY = `hidden`;

        window.scrollTo(0, 0);

        anime({
            targets: urlBox,
            height: searchBoxHeights().reverse(),
            duration: 600,
            easing: `easeOutExpo`,
            complete: () => {
                if(document.getElementById(`listbox`)) listboxParent.removeChild(document.getElementById(`listbox`));

                urlBox.style.height = `calc(100vh - 80px)`
                
                if(checkParse) {
                    if(parse) {
                        parseInfo();
                    } else {
                        parse = true;
                    }
                }
            }
        });
    }

    let info = null;

    const parseInfo = async () => {
        progressObj.remove();
        progressObj = null;

        const listbox = listboxTemplate.cloneNode(true);
        
        if(listbox.classList.contains(`d-none`)) listbox.classList.remove(`d-none`);

        listboxParent.appendChild(listbox);
        
        const formatList = listbox.querySelector(`#formatList`);
        
        input.disabled = false;
        button.disabled = false;

        currentInfo = info;
        
        document.body.style.overflowY = `scroll`;

        if(info.error) {
            document.getElementById(`errorMsg`).innerHTML = info.error;

            if(document.getElementById(`errorMsg`).classList.contains(`d-none`)) {
                document.getElementById(`errorMsg`).classList.remove(`d-none`);
            };

            return;
        } else {
            anime({
                targets: urlBox,
                height: searchBoxHeights(),
                duration: 1000,
                easing: `easeOutExpo`,
            });

            listbox.querySelector(`#mediaTitle`).innerHTML = `[${func == `search` ? `Search` : info.webpage_url_domain}] ${info.title}`;

            if(info.thumbnails && info.thumbnails.length > 0) {
                const thumbnail = info.thumbnails[info.thumbnails.length - 1];

                console.log(`thumbnail:`, thumbnail);

                const img = new Image();

                img.addEventListener(`load`, () => {
                    if(currentInfo.webpage_url == info.webpage_url) {
                        document.getElementById(`background`).style.backgroundImage = `url(${thumbnail.url})`;

                        anime.remove(background)

                        anime({
                            targets: background,
                            opacity: [0, 0.15],
                            duration: 1000,
                            easing: `easeOutQuad`
                        })
                    }
                });

                img.src = thumbnail.url;
            }

            console.log(info)
            
            qualityButtons({ card: listbox, node: listbox.querySelector(`#qualityButtons`), info, centerURLBox: info.entries ? centerURLBox : () => {} });

            if(info.entries) {
                for (const entry of info.entries) {
                    const card = formatCard.cloneNode(true);

                    card.querySelector(`#formatMetaList`).classList.add(`d-none`);

                    card.querySelector(`#buttonsDiv`).style.minHeight = `36px`;

                    card.querySelector(`#mediaIcons`).style.width = `24px`
                    card.querySelector(`#mediaIcons`).style.minWidth = `24px`
                    card.querySelector(`#mediaIcons`).style.maxWidth = `24px`

                    card.querySelector(`#audioIcon`).classList.add(`d-none`);
                    card.querySelector(`#videoIcon`).classList.add(`d-none`);

                    if(entry.webpage_url) {
                        card.querySelector(`#linkIcon`).classList.remove(`d-none`);
                        card.querySelector(`#nameDiv`).style.cursor = `pointer`;
                        card.querySelector(`#nameDiv`).addEventListener(`click`, () => {
                            location.href = entry.webpage_url
                        })
                    } else card.querySelector(`#fileIcon`).classList.remove(`d-none`);

                    if(!entry.title) entry.title = entry.webpage_url;
                    if(!entry.title) entry.title = entry.url;

                    card.querySelector(`#formatName`).innerHTML = entry.title;

                    if(entry.uploader || entry.channel) {
                        card.querySelector(`#formatSubtext`).innerHTML = `${entry.uploader || entry.channel}`;
                        if(entry.released) {
                            card.querySelector(`#formatSubtext`).innerHTML += ` | ${entry.released.string.split(`,`)[0] + ` ago`}`;
                        }
                        card.querySelector(`#formatSubtext`).classList.remove(`d-none`);
                    } else if(entry.released) {
                        card.querySelector(`#formatSubtext`).innerHTML += ` | ${entry.released.string.split(`,`)[0] + ` ago`}`;
                        card.querySelector(`#formatSubtext`).classList.remove(`d-none`);
                    }

                    if(entry.webpage_url) {

                    }

                    if(entry.duration) {
                        card.querySelector(`#fileFormat`).innerHTML = `${entry.duration.timestamp}`;
                    } else {
                        card.querySelector(`#fileFormat`).classList.add(`d-none`)
                    }

                    //card.querySelector(`#saveOptions`).innerHTML = ``;

                    const newDiv = listbox.querySelector(`#qualityButtons`).cloneNode(true);

                    newDiv.style.padding = `0px`;
                    newDiv.style.minWidth = `100%`;
                    newDiv.style.removeProperty(`background`);

                    card.querySelector(`#formatDownload`).classList.add(`d-none`)

                    const innerQualityButtons = newDiv.querySelector(`#innerQualityButtons`);

                    innerQualityButtons.style.minWidth = `100%`;

                    card.querySelector(`#innerFormatCard`).appendChild(newDiv);

                    const removeEntry = () => {
                        const thisIndex = info.entries.findIndex(o => (o.id || o.webpage_url || o.url) == (entry.id || entry.webpage_url || entry.url));
                        if(thisIndex != -1) {
                            console.log(`Removing index ${thisIndex}`)
                            info.entries.splice(thisIndex, 1);
                        } else console.log(`Failed to find index for ${entry.id || entry.webpage_url || entry.url}`)
                    }

                    console.log(`innerFormatCard`, card.querySelector(`#innerFormatCard`))

                    qualityButtons({ node: card.querySelector(`#innerFormatCard`), info: entry, card, removeEntry: () => removeEntry() });

                    card.querySelector(`#pausePlayButton`).classList.remove(`d-none`);
                    card.querySelector(`#pausePlayButton`).classList.add(`d-flex`);
                    card.querySelector(`#crossicon`).classList.remove(`d-none`);
                    card.querySelector(`#pauseicon`).classList.add(`d-none`);

                    card.querySelector(`#pausePlayButton`).onclick = () => removeCardAnim(card, removeEntry);

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

                    console.log(`running conversionOptions`)

                    conversionOptions(card, entry)

                    formatList.appendChild(card);

                    await new Promise((resolve) => setTimeout(resolve, 1));
                }
            } else if(info.formats) {
                /*document.getElementById(`qualityButtons`).querySelectorAll(`.btn`).forEach((btn, i) => {
                    btn.onclick = () => {
                        btn.disabled = true;
                        btn.opacity = 0.5;
                        
                        startDownload(btn, {
                            url: url,
                            format: qualities[i],
                            info: Object.assign({}, info, { formats: null }),
                        });
                    }
                });*/
                
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

                if(info.formats.filter(f => f.audio).length == 0) document.getElementById(`downloadBestAudio`).classList.add(`d-none`);
                if(info.formats.filter(f => f.video).length == 0) document.getElementById(`downloadBestVideo`).classList.add(`d-none`);

                /*let qualities = [`bv*+ba/b`, `ba`, `bv`]

                listbox.querySelector(`#qualityButtons`).querySelectorAll(`.btn`).forEach((btn, i) => {
                    btn.onclick = () => {
                        btn.disabled = true;
                        btn.opacity = 0.5;
                        
                        startDownload(btn, {
                            url: url,
                            format: qualities[i],
                            info: Object.assign({}, info, { formats: null }),
                        });
                    }
                });*/
                
                for (const format of info.formats) {
                    //console.log(format)
                    const formatDownloadType = format.audio && format.video ? `both` : format.audio && !format.video ? `audio` : `video`;

                    const card = formatCard.cloneNode(true);

                    const saveOptions = listboxTemplate.querySelector(`#saveOptions`).cloneNode(true)

                    card.appendChild(saveOptions)

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
                        card.querySelector(`#audioIcon`).style.opacity = `35%`;
                    }

                    if(format.video) {
                        card.querySelector(`#videoIcon`).style.opacity = `100%`;
                        //card.querySelector(`#formatConversionTextbox`).classList.add(`d-none`);
                    } else {
                        card.querySelector(`#videoIcon`).style.opacity = `35%`;
                    }

                    card.querySelector(`#formatConversionTextbox`).placeholder = `${format.ext}`;
                    card.querySelector(`#saveLocation`).value = `${config && config.saveLocation ? config.saveLocation : `{default save location}`}`;

                    if(config.lastMediaConversionOutputs[formatDownloadType]) card.querySelector(`#formatConversionTextbox`).value = config.lastMediaConversionOutputs[formatDownloadType];

                    const saveOptionsIcon = card.querySelector(`#downloadicon`)

                    const btn = card.querySelector(`#formatDownload`);
                    
                    const confirmDownload = () => {
                        saveOptionsAnimations.fadeOut(btn, saveOptions, btnClick);

                        btn.disabled = true;

                        const bar = card.querySelector(`#progressBar`);
                        const fill = card.querySelector(`#progressFill`);

                        if(card.querySelector(`#formatConversionTextbox`).value != config.lastMediaConversionOutputs[formatDownloadType]) {
                            let j = {};

                            j[formatDownloadType] = card.querySelector(`#formatConversionTextbox`).value;
                        }

                        const dotSize = Number.parseInt(fill.style.width.replace(`px`, ``));
                        const range = Number.parseInt(bar.style.width.replace(`px`, ``)) - dotSize;

                        card.style.opacity = 0.5;

                        console.log(format.format_id)

                        startDownload(card, {
                            url: url,
                            format: format.format_id,
                            convert: card.querySelector(`#formatConversionTextbox`).value ? {
                                ext: card.querySelector(`#formatConversionTextbox`).value
                            } : null,
                            ext: null,
                            filePath: card.querySelector(`#saveLocation`).value || null,
                            info: Object.assign({}, info, { formats: null }),
                        });
                    }

                    card.querySelector(`#convertDownload`).parentElement.removeChild(card.querySelector(`#convertDownload`));
                    card.querySelector(`#confirmDownload`).style.width = `100%`
                    card.querySelector(`#confirmDownload`).onclick = () => confirmDownload();

                    const btnClick = () => {
                        if(saveOptions.classList.contains(`d-none`)) {
                            saveOptionsAnimations.fadeIn(btn, saveOptions, btnClick);
                        } else {
                            saveOptionsAnimations.fadeOut(btn, saveOptions, btnClick);
                        }
                    }

                    btn.onclick = () => btnClick()

                    formatList.appendChild(card);

                    await new Promise((resolve) => setTimeout(resolve, 1));
                }
            }
        }
    }

    let parse = false;

    mainQueue[func || `getInfo`](url).then(data => {
        info = data;

        if(parse) {
            parseInfo();
        } else {
            parse = true;
        }
    })
    
    input.disabled = true;
    button.disabled = true;

    if(!document.getElementById(`errorMsg`).classList.contains(`d-none`)) {
        document.getElementById(`errorMsg`).classList.add(`d-none`);
    }

    if(document.getElementById(`listbox`)) {
        centerURLBox(true, true);

        anime.remove(background)

        anime({
            targets: background,
            opacity: [0.15, 0],
            duration: 500,
            easing: `easeOutExpo`
        })
    } else if(parse) {
        parseInfo();
    } else {
        parse = true;
    }
}

const processURL = () => {
    const url = input.value;

    console.log (`clicc`, url)

    const genericUrlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

    const match = url.match(genericUrlRegex);

    console.log (`match`, match)

    if(match) {
        runSearch(url, `Fetching info...`, `getInfo`)
    } else {
        runSearch(url, `Running search...`, `search`)
    }
}

button.onclick = () => processURL();

input.addEventListener(`keyup`, (e) => {
    if(e.key == `Enter` || e.keyCode == 13) processURL();
});

changelog.check();