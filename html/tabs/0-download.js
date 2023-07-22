if(!tabs[`Download`]) tabs[`Download`] = {
    name: `Download`,
    icon: `arrow-alt-circle-down`,
    container: null,
    colorScheme: 0,
    initializePage: (container, { setBackground, wavesAnims, colorScheme }) => {
        const urlBox = container.querySelector(`#urlBox`);
        const innerUrlBox = container.querySelector(`#innerUrlBox`);
        
        const searchSelectionBox = container.querySelector(`#searchSelectionBox`);
        const innerSearchSelectionBox = container.querySelector(`#innerSelectionBox`);
        
        const input = container.querySelector(`#urlInput`);
        const button = container.querySelector(`#urlEnter`);
        
        button.style.background = `rgb(${colorScheme.light.r}, ${colorScheme.light.g}, ${colorScheme.light.b})`;
        
        const pasteButton = container.querySelector(`#urlPaste`);
        
        const searchButtons = [pasteButton];
        
        searchButtons.forEach(btn => {
            const icon = btn.querySelector(`#icon`);
        
            const backgroundColor = btn.style.backgroundColor;
            const color = btn.style.color;
        
            btn.onmouseover = () => {
                anime.remove(btn);
        
                btn.style.backgroundColor = `rgb(${colorScheme.light.r}, ${colorScheme.light.g}, ${colorScheme.light.b})`;
                btn.style.color = `rgb(0,0,0)`;
        
                anime({
                    targets: btn,
                    duration: 500,
                    easing: `easeOutExpo`
                })
        
                anime.remove(icon);
                anime({
                    targets: icon,
                    scale: 1.2,
                    duration: 500,
                    easing: `easeOutExpo`
                })
            };
        
            btn.onmouseout = () => {
                anime.remove(btn);
        
                btn.style.backgroundColor = backgroundColor;
                btn.style.color = color;
        
                anime({
                    targets: btn,
                    duration: 500,
                    easing: `easeOutExpo`
                })
        
                anime.remove(icon);
                anime({
                    targets: icon,
                    scale: 1,
                    duration: 500,
                    easing: `easeOutExpo`
                })
            };
        
            btn.addEventListener(`click`, () => btn.onmouseout())
        })
        
        const mediaMetaItem = container.querySelector(`#mediaMetaItem`).cloneNode(true);
        container.querySelector(`#mediaMetaItem`).parentNode.removeChild(container.querySelector(`#mediaMetaItem`));
        
        const listboxParent = container.querySelector(`#listbox`).parentElement;
        
        const advancedOptions = container.querySelector(`#advancedOptions`);
        
        const extraArguments = container.querySelector(`#extraArguments`);
        
        if(!config.advanced) advancedOptions.classList.add(`d-none`)
        
        listboxParent.removeChild(container.querySelector(`#listbox`));
        
        let changesMadeToInput = true;
        
        let currentInfo = null;
        
        mainQueue.formatStatusUpdate((content) => container.querySelector(`#statusText`).innerHTML = content);
        
        let progressObj = null;
        
        mainQueue.formatStatusPercent(val => {
            const current = val[0];
            const total = val[1];
        
            if(progressObj) progressObj.setProgress((val[0]/val[1])*100, `(${current}/${total})`);
        })
        
        let selectedSearch = null;
        
        let resultsVisible = false;
        
        const mainInput = {
            disable: () => {
                input.disabled = true;
                button.disabled = true;
                pasteButton.disabled = true;
        
                searchButtons.forEach(btn => {
                    btn.disabled = true;
        
                    const thisIcon = btn.querySelector(`#icon`);
        
                    anime.remove(thisIcon);
                    anime({
                        targets: thisIcon,
                        scale: 0,
                        duration: 500,
                        easing: `easeOutCirc`
                    });
                });
            },
            enable: () => {
                input.disabled = false;
                button.disabled = false;
        
                searchButtons.forEach(btn => {
                    btn.disabled = false;
        
                    const thisIcon = btn.querySelector(`#icon`);
        
                    anime.remove(thisIcon);
                    anime({
                        targets: thisIcon,
                        scale: 1,
                        duration: 500,
                        easing: `easeOutCirc`
                    });
                });
            }
        };
        
        let existingCenterBoxPromise = null;
        let centerURLBox = () => existingCenterBoxPromise ? existingCenterBoxPromise : new Promise(r => {
            if(!container.querySelector(`#listbox`)) return r(false);
            r(false)
        });

        searchTagsEditCallback(container, () => centerURLBox(true))

        let lastSearch = null;
        
        const runSearch = async (url, initialMsg, func) => {
            system.hasFFmpeg().then(has => {
                hasFFmpeg = has;
            });
        
            configuration.get(`ffmpegPresets`).then(o => {
                enabledConversionFormats = o.filter(o => config.ffmpegPresets[o.key]);
                console.log(`enabled conversion formats`, enabledConversionFormats)
            });
            
            container.querySelector(`#statusText`).innerHTML = initialMsg || `Fetching info...`;
            if(container.querySelector(`#statusText`).classList.contains(`d-none`)) container.querySelector(`#statusText`).classList.remove(`d-none`);
        
            progressObj = addProgressBar(container.querySelector(`#urlBox`), `80%`);
        
            console.log(`${initialMsg || `running search for`}: ${url}`)
        
            let info = null;
        
            centerURLBox = (removeListbox, duration) => {
                if(existingCenterBoxPromise) {
                    console.log(`centerURLBox: existing promise found; returning...`)
                    return existingCenterBoxPromise;
                } else {
                    console.log(`centerURLBox: no existing promise found; creating new promise...`)
                    const promise = new Promise(async res => {    
                        console.log(`centerURLBox called; resultsVisible: ${resultsVisible}; doing anything? ${resultsVisible != false}`);
                    
                        if(!resultsVisible) return res(false);
                    
                        resultsVisible = false;
                    
                        currentInfo = null;
                    
                        window.scrollTo(0, 0);
                    
                        duration = Number(duration) || 600;
                    
                        const growUrlBox = (d) => {
                            currentInfo = null;

                            setBackground(false);
                
                            anime({
                                targets: urlBox,
                                height: searchBoxHeights().reverse(),
                                duration: d || duration,
                                easing: `easeOutCirc`,
                                complete: () => {
                                    if(container.querySelector(`#listbox`)) listboxParent.removeChild(container.querySelector(`#listbox`));
                    
                                    urlBox.style.height = `calc(100vh - 80px)`;
                
                                    res(true);
                                }
                            });
                        }
                    
                        if(config.reduceAnimations) {
                            if(removeListbox && container.querySelector(`#listbox`)) {
                                anime({
                                    targets: container.querySelector(`#listbox`),
                                    opacity: [1, 0],
                                    duration: duration/2,
                                    easing: `easeOutCirc`,
                                    complete: () => {
                                        if(container.querySelector(`#listbox`)) listboxParent.removeChild(container.querySelector(`#listbox`));
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
        
                const headingContainer = listbox.querySelector(`#headingContainer`);
                
                const formatList = listbox.querySelector(`#formatList`);
        
                currentInfo = info;
        
                const throwToURL = (node, card, entry) => {
                    const url = entry.media_metadata.url.source_url;

                    clearSearchTags();
        
                    mainInput.enable();
                    
                    if(config.disableAnimations) {
                        input.value = url;
                        runSearch(input.value, `Fetching info...`, `getInfo`)
                    } else {
                        const nodeBounds = node ? node.getBoundingClientRect() : null;
        
                        let style = node ? node.style : null;
        
                        const newCard = node || popout(card);
        
                        if(!style) style = newCard.style;
        
                        console.log(`modifying width`, JSON.parse(JSON.stringify(node ? node.style : style)));
        
                        const bounding = nodeBounds || (newCard).getBoundingClientRect();
        
                        //if(node && node.style.maxWidth) bounding.width += parseInt(node.style.maxWidth)/2;
        
                        let useScale = style.scale;
        
                        console.log(`modifying width -- usescale: ${useScale}; type: ${typeof useScale}`)
        
                        if(typeof useScale == `number` && useScale != 1) {
                            console.log(`modifying width -- original: ${bounding.width} (${1/useScale} * ${bounding.width/2})`)
                            bounding.width += ((1/useScale) * (bounding.width/2))
                            console.log(`modifying width -- new: ${bounding.width}`)
                        }
                        //if(node && node.style.maxHeight) bounding.height = parseInt(node.style.maxHeight);
        
                        centerURLBox(null, 900);
        
                        if(entry && entry.fullInfo) {
                            console.log(`fullInfo already provided; replacing info with fullInfo`);
                            runSearch(entry, `Reading entry...`, `getInfo`)
                        } else {
                            runSearch(url, `Fetching info...`, `getInfo`)
                        }
        
                        window.scrollTo(0, 0);
        
                        anime.remove(newCard)
        
                        let initialTargets = [];
        
                        if(newCard.querySelector(`#formatCardBG`)) initialTargets.push(newCard.querySelector(`#formatCardBG`));
                        if(newCard.querySelector(`#innerFormatCard`)) initialTargets.push(newCard.querySelector(`#innerFormatCard`));
                        
                        anime({
                            targets: initialTargets,
                            easing: `easeOutCirc`,
                            borderRadius: `${Math.floor(bounding.height, bounding.width)/2}px`,
                            duration: 500,
                        });
        
                        anime({
                            targets: newCard,
                            //left: (1/parseInt(useScale)) * (bounding.width/2),
                            left: innerUrlBox.getBoundingClientRect().left + `px`,
                            marginLeft: 0,
                            marginRight: 0,
                            marginBottom: 0,
                            marginTop: 0,
                            margin: 0,
                            top: (window.innerHeight - 90) + `px`,
                            maxHeight: innerUrlBox.getBoundingClientRect().height + `px`,
                            scale: 1,
                            easing: `easeOutCirc`,
                            borderRadius: `${Math.floor(bounding.height, bounding.width)/2}px`,
                            duration: 400,
                            complete: () => {
                                console.log(`throwing node`)
                                throwNode(newCard, innerUrlBox, true, true).then(() => {
                                    console.log(`parseInfo: node hit`)
                                    //runSearch(entry, `Reading entry...`, `getInfo`)
                                    //input.value = entry.webpage_url || entry.url;
                                    //runSearch(input.value, `Fetching info...`, `getInfo`)
                                })
                            }
                        })
                    }
                }
        
                if(!info || info.error) {
                    console.log(`Errored. Doing nothing.`)
        
                    progressObj.remove();
                    progressObj = null;
        
                    refreshSelectionBox();
                } else {
                    listbox.querySelector(`#mediaTitle`).innerHTML = ``;
        
                    let type = `${info.extractor_key || info.extractor || info.webpage_url_domain}`.split(/(?=[A-Z])/).slice(0, -1).join(``);
                    let iconExtra = ``;

                    info._ezytdl_ui_icon = `arrow-alt-circle-down`;
                    info._ezytdl_ui_type = `Download`;
                    info._ezytdl_ui_title = `Downloaded from ${type}`;
        
                    const setIcon = (name, original, extra) => {
                        console.log(`checking if icon "fab fa-${name}" exists (from ${original}) -- extra: ${extra || `(none)`}`);
                        if(faIconExists(`fab`, name)) {
                            console.log(`icon exists! setting icon...`)
                            let icon = document.createElement(`i`);
                            icon.style.fontWeight = `normal`;
                            icon.style.marginRight = `12px`;
                            icon.classList.add(`fab`);
                            icon.classList.add(`fa-${name}`);
                            if(typeof extra == `string`) iconExtra = `/ ` + extra;
                            return icon;
                        } else {
                            console.log(`icon does not exist!`)
                            return false;
                        }
                    };

                    const findIcon = (entry) => {
                        let useIcon;

                        if(!useIcon && entry.webpage_url_domain) useIcon = setIcon(entry.webpage_url_domain.split(`.`).slice(-2, -1)[0].toLowerCase(), `webpage_url_domain`);
                        if(!useIcon && entry.extractor) useIcon = setIcon(entry.extractor.split(`:`)[0].toLowerCase(), `extractor`, entry.extractor.split(`:`).slice(1).map(s => s[0].toUpperCase() + s.slice(1)).join(` `));
                        if(!useIcon) useIcon = setIcon(type.toLowerCase(), type);
                        if(!useIcon) useIcon = setIcon(type.split(/(?=[A-Z])/)[0].toLowerCase(), `"${type}" split by capital letters`, type.split(/(?=[A-Z])/).slice(1).join(``));
                        if(!useIcon && entry.webpage_url_domain && entry.webpage_url_domain.split(`.`).slice(-2, -1)[0].toLowerCase().endsWith(`app`)) useIcon = setIcon(entry.webpage_url_domain.split(`.`).slice(-2, -1)[0].toLowerCase().slice(0, -3), `webpage_url_domain (without app at end)`);

                        return useIcon;
                    }
        
                    const getIcon = (entry) => {
                        const generic = () => {
                            switch(typeof entry == `object` ? entry.ezytdl_type : ``) {
                                case `user`:
                                    return `fas fa-user-circle`;
                                case `playlist`:
                                    return `fas fa-list`;
                                case `video`:
                                    return `fas fa-video`;
                                case `audio`:
                                    return `fas fa-music`;
                                case `media`:
                                    return `fas fa-play-circle`;
                                default:
                                    return `fas fa-link`;
                            }
                        }

                        if(info.extractor == `multiple:generic`) {
                            const brandIcon = findIcon(entry);

                            if(brandIcon) {
                                return brandIcon.className;
                            } else return generic();
                        } else return generic();
                    }
        
                    let icon = findIcon(info);
        
                    if(icon) listbox.querySelector(`#mediaTitle`).appendChild(icon);
        
                    listbox.querySelector(`#mediaTitle`).innerHTML += `${info.media_metadata.general.title}`;
        
                    const getType = (entry) => {
                        let type = `${entry.extractor_key || entry.extractor || entry.webpage_url_domain}`.split(/(?=[A-Z])/)[0];
        
                        if(entry.entries && entry.entries[0] && (entry.entries[0].album || entry.entries[0].track)) {
                            return `album`
                        } else if(entry.categories && entry.categories.map(f => f.toString().toLowerCase()).find(f => f == `music`) || entry.track || entry.album) {
                            return `song`
                        } else if(entry.ezytdl_key_type && `${entry.ezytdl_key_type}`.toLowerCase() != `${type}`.toLowerCase()) {
                            return `${entry.ezytdl_key_type}`
                        } else if(entry.ezytdl_type) {
                            return `${entry.ezytdl_type}`
                        } else return `listing`;
                    }
        
                    const updateMetadata = async (parse) => {
                        if(parse) info = await mainQueue.parseInfo(info);
        
                        let afterType = ``;
        
                        if(func == `search`) {
                            afterType += ` search`
                        } else afterType += getType(info);
        
                        if(info.media_metadata.url.source_url) {
                            const a = document.createElement(`a`);
        
                            a.href = info.media_metadata.url.source_url;
                            a.innerHTML = ` ` + afterType.trim();
        
                            a.style.color = `white`;
                            a.style.textDecoration = `none`;
        
                            new Draggable({
                                node: a,
                                enableClickRecognition: false,
                                allowPopout: false,
                            })
        
                            afterType = a
                        }
        
                        const parseCreator = (entry, prefix=``) => {
                            if(entry.media_metadata.url.artist_url) {
                                const a = document.createElement(`a`);
        
                                a.href = entry.media_metadata.url.artist_url;
                                a.innerHTML = prefix + entry.media_metadata.general.artist;
        
                                a.style.color = `white`;
                                a.style.textDecoration = `none`;
        
                                a.style.margin = `0px`
        
                                new Draggable({
                                    node: a,
                                    targets: [input, urlBox],
                                    value: entry.media_metadata.url.artist_url,
                                    targetScale: 1.1,
                                    animateDrop: false,
                                    animateDropFail: true,
                                    hint: `Drag to URL box to retrieve info!`,
                                    //hideOriginal: false,
                                    dropHook: (success, clone) => {
                                        if(success) {
                                            console.log(`dropped! (${success})`);
                
                                            clone.style.top = `${window.innerHeight - parseInt(clone.style.bottom)}px`;
                                            clone.style.bottom = `0px`
                
                                            throwToURL(clone, null, entry);
                                        } else {
                                            console.log(`did not hit target`)
                                        };
                                    }
                                })
        
                                return a;
                            } else {
                                return prefix + entry.media_metadata.general.artist;
                            }
                        };
        
                        let items = 0;
        
                        let ids = [];
        
                        const addMetaItem = (icon, content, secondaryText, id) => {
                            id = `meta-${id}`
                            items++;
                            console.log(`Meta item: ${icon} / ${content}`);
                            if(headingContainer.querySelector(`#${id}`)) headingContainer.querySelector(`#${id}`).remove();
                            const metaItem = mediaMetaItem.cloneNode(true);
        
                            const txt = metaItem.querySelector(`#txt`);
                            const iconEl = metaItem.querySelector(`#icon`);
        
                            ids.push(id);
                            metaItem.id = id;
                            iconEl.classList.value = `fas ${icon}`;
                            if(typeof content == `string`) {
                                txt.innerHTML = content;
                            } else {
                                txt.replaceWith(content);
                            };
        
                            if(secondaryText) {
                                console.log(`secondaryText for ${id}: ${secondaryText}`)
        
                                txt.style.textDecorationStyle = `dotted`;
        
                                const originalContent = txt.innerHTML;
        
                                metaItem.addEventListener(`mouseover`, () => {
                                    console.log(`secondaryText for ${id}: mouseover`)
        
                                    anime.remove(txt);
                                    anime({
                                        targets: txt,
                                        opacity: [1, 0],
                                        scaleX: 1.5,
                                        duration: 300,
                                        easing: `easeInCirc`,
                                        complete: () => {
                                            txt.innerHTML = secondaryText;
                                            anime({
                                                targets: txt,
                                                opacity: [0, 1],
                                                scaleX: [0.75, 1],
                                                duration: 600,
                                                easing: `easeOutCirc`,
                                            })
                                        }
                                    })
                                });
        
                                metaItem.addEventListener(`mouseout`, () => {
                                    console.log(`secondaryText for ${id}: mouseout`)
                                    
                                    anime.remove(txt);
                                    if(txt.innerHTML == secondaryText) {
                                        anime({
                                            targets: txt,
                                            opacity: 0,
                                            scaleX: 0.75,
                                            duration: 300,
                                            easing: `easeInCirc`,
                                            complete: () => {
                                                txt.innerHTML = originalContent;
                                                anime({
                                                    targets: txt,
                                                    opacity: [0, 1],
                                                    scaleX: [0.75, 1],
                                                    duration: 600,
                                                    easing: `easeOutCirc`,
                                                })
                                            }
                                        })
                                    }
                                })
                            }
                            
                            return headingContainer.appendChild(metaItem);
                        }
        
                        if(info._off_platform) addMetaItem(`fa-info-circle`, `Off-platform.`, (`This content was found on a platform not supported by yt-dlp. ` + (info.entries ? `ezytdl will attempt to find equivalent media on supported platforms during download, however there's no guarantees it'll be 100% accurate.` : `This is the most suitable equivalent ezytdl was able to find on another platform.`)), `off-platform`)
        
                        if(info.media_metadata.general.artist) addMetaItem(`fa-user`, parseCreator(info, `by `), null, `creator`);
        
                        if(info.entries && func != `search`) {
                            let str = mediaMetaItem.querySelector(`#txt`).cloneNode(true);
        
                            str.innerHTML = ``;
        
                            //str.style.margin = `0px`
                            //str.classList.add(`d-flex`)
        
                            let artists = [];
                            let parsableArtists = [];
        
                            for (const entry of info.entries) {
                                if(entry.media_metadata.general.artist && entry.media_metadata.general.artist != info.media_metadata.general.artist && !artists.includes(entry.media_metadata.general.artist)) {
                                    artists.push(entry.media_metadata.general.artist);
                                    parsableArtists.push(parseCreator(entry));
                                }
                            };
        
                            let more = parsableArtists.splice(2).length;
        
                            if(artists.length > 0) str.innerHTML += (artists.length == 1 ? `exclusively featuring ` : `including `) + ` `// + ` ${parsableArtists.join(`, `)}`;
                            parsableArtists.forEach((artist, i) => {
                                if(i == 0) {
                                    if(typeof artist == `string`) {
                                        str.innerHTML += artist
                                    } else str.appendChild(artist);
                                } else if(i == parsableArtists.length - 1) {
                                    str.innerHTML += ` and `
                                    if(typeof artist == `string`) {
                                        str.innerHTML += artist
                                    } else str.appendChild(artist);
                                } else {
                                    str.innerHTML += `, `
                                    if(typeof artist == `string`) {
                                        str.innerHTML += artist
                                    } else str.appendChild(artist);
                                }
                                //if(i == 0) str += artist.outerHTML;
                                //else if(i == parsableArtists.length - 1) str += ` and ${artist.outerHTML}`;
                                //else str += `, ${artist.outerHTML}`;
                            });
        
                            if(more > 0) str.innerHTML += `, and ${more} more`;
        
                            if(str.innerHTML) addMetaItem(`fa-list`, str, null, `includes`);
                        };
        
                        if(info.duration && info.duration.string && info.duration.units.ms) addMetaItem(`fa-clock`, info.duration.string, null, `duration`);
        
                        if(info.entries && info.ezytdl_type == `user`) {
                            addMetaItem(`fa-user-circle`, info.entries.length + ` upload${info.entries.length == 1 ? `` : `s`}`, null, `entries`)
                        } else if(info.entries) {
                            addMetaItem(`fa-play-circle`, info.entries.length + ` entr${info.entries.length == 1 ? `y` : `ies`}`, null, `entries`)
                        } else if(info.formats) {
                            addMetaItem(`fa-play-circle`, info.formats.length + ` format${info.formats.length == 1 ? `` : `s`}`, null, `formats`)
                        }
        
                        listbox.querySelector(`#mediaSubtext`).innerHTML = ((type || iconExtra)).trim();
        
                        if(typeof afterType == `string` && afterType.length > 0) {
                            listbox.querySelector(`#mediaSubtext`).innerHTML += ` ${afterType}`;
                        } else if(afterType) {
                            listbox.querySelector(`#mediaSubtext`).appendChild(afterType);
                        }
        
                        headingContainer.querySelectorAll(`.mediaMetaItem`).forEach(item => {
                            if(!ids.includes(item.id)) {
                                const currentHeight = item.getBoundingClientRect().height;
                                item.id += `-removed`;
                                anime({
                                    targets: item,
                                    maxHeight: [currentHeight + `px`, `0px`],
                                    height: [currentHeight + `px`, `0px`],
                                    opacity: 0,
                                    duration: 500,
                                    easing: `easeOutCirc`,
                                    complete: () => {
                                        if(item.parentElement) item.parentElement.removeChild(item);
                                    }
                                });
                            }
                        });
                    };
        
                    updateMetadata();
        
                    let thumbnail = null;
        
                    if(!thumbnail && info.thumbnails && info.thumbnails.length > 0) thumbnail = info.thumbnails[info.thumbnails.length - 1];
                    if(!thumbnail && info.entries && info.entries.find(o => o && o.thumbnails && o.thumbnails.length > 0)) thumbnail = info.entries.find(o => o.thumbnails && o.thumbnails.length > 0).thumbnails[info.entries.find(o => o.thumbnails && o.thumbnails.length > 0).thumbnails.length - 1];
        
                    if(thumbnail) {
                        console.log(`thumbnail:`, thumbnail);
        
                        const img = new Image();
        
                        img.addEventListener(`load`, () => {
                            if(currentInfo.media_metadata.url.source_url == info.media_metadata.url.source_url) {
                                setBackground(thumbnail.url);
                            }
                        });
        
                        img.src = thumbnail.url;
                    }
        
                    console.log(info);
        
                    let parseProgress = addProgressBar(container.querySelector(`#urlBox`), `80%`);
        
                    if(info.is_live) listbox.querySelector(`#qualityButtons`).classList.add(`d-none`);
        
                    const appendCard = (card) => {
                        /*const convertDownload = card.querySelector(`#convertDownload`);
                        if(!convertDownload || convertDownload.classList.contains(`d-none`)) {
                            if(card.querySelector(`#confirmDownload`)) highlightButton(card.querySelector(`#confirmDownload`), colorScheme)
                        } else {
                            const originalConvertClick = convertDownload.onclick;
        
                            const originalConvertDownloadBG = convertDownload.style.backgroundColor;
        
                            convertDownload.onclick = () => {
                                convertDownload.style.backgroundColor = originalConvertDownloadBG;
                                originalConvertClick();
                                highlightButton(card.querySelector(`#confirmDownload`), colorScheme)
                            }
                            
                            highlightButton(convertDownload, colorScheme);
                        };*/
                        if(card.querySelector(`#confirmDownload`)) {
                            //highlightButton(card.querySelector(`#confirmDownload`), colorScheme)
                            if(!card.querySelector(`#confirmDownload`).classList.contains(`ez-selected`)) card.querySelector(`#confirmDownload`).classList.add(`ez-selected`);
                            //if(!btn.classList.contains(`ez-selected`)) btn.classList.add(`ez-selected`);
                        }
        
                        formatList.appendChild(card);
                    };
        
                    if(info.entries) {
                        if(info.entries.filter(e => e.entries).length == info.entries.length || info.entries.length == 0) {
                            listbox.querySelector(`#qualityButtons`).classList.add(`d-none`);
                        }
        
                        for (const i in info.entries) {
                            const entry = info.entries[i];
        
                            parseProgress.setProgress((i/info.entries.length)*100, `Parsing entry ${i}/${info.entries.length}`);
        
                            const card = formatCard.cloneNode(true);
        
                            new Draggable({
                                node: card,
                                targets: [input, urlBox],
                                value: entry.media_metadata.url.source_url,
                                targetScale: 0.5,
                                animateDrop: false,
                                animateDropFail: true,
                                hint: `Drag to URL box to retrieve info!`,
                                //hideOriginal: false,
                                dropHook: (success, clone) => {
                                    if(success) {
                                        console.log(`dropped! (${success})`);
        
                                        clone.style.top = `${window.innerHeight - parseInt(clone.style.bottom)}px`;
                                        clone.style.bottom = `0px`
        
                                        throwToURL(clone, null, entry);
                                    } else {
                                        console.log(`did not hit target`)
                                    };
                                }
                            })
        
                            card.querySelector(`#formatMetaList`).classList.add(`d-none`);
        
                            card.querySelector(`#buttonsDiv`).style.minHeight = `36px`;
        
                            card.querySelector(`#mediaIcons`).style.width = `24px`
                            card.querySelector(`#mediaIcons`).style.minWidth = `24px`
                            card.querySelector(`#mediaIcons`).style.maxWidth = `24px`

                            card.querySelector(`#mediaIcons`).classList.remove(`justify-content-between`);
                            card.querySelector(`#mediaIcons`).classList.add(`justify-content-center`);
        
                            card.querySelector(`#audioIcon`).classList.add(`d-none`);
                            card.querySelector(`#videoIcon`).classList.add(`d-none`);
        
                            if(entry.media_metadata.url.source_url) {
                                card.querySelector(`#linkIcon`).className = getIcon(entry);
                                card.querySelector(`#linkIcon`).classList.remove(`d-none`);
        
                                card.querySelector(`#nameDiv`).style.cursor = `pointer`;
                                card.querySelector(`#nameDiv`).addEventListener(`click`, () => {
                                    location.href = entry.media_metadata.url.source_url
                                })
                            } else card.querySelector(`#fileIcon`).classList.remove(`d-none`);
        
                            card.querySelector(`#formatName`).innerHTML = entry.output_name.includes(`Unknown`) ? entry.media_metadata.general.title : entry.output_name;
        
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
        
                            if(entry.duration && entry.duration.timestamp != `--:--`) {
                                card.querySelector(`#fileFormat`).innerHTML = `${entry.duration.timestamp}`;
                            } else {
                                card.querySelector(`#fileFormat`).classList.add(`d-none`)
                            }
        
                            //card.querySelector(`#saveOptions`).innerHTML = ``;
        
                            const removeEntry = () => {
                                const thisIndex = info.entries.findIndex(o => o.media_metadata.url.source_url == entry.media_metadata.url.source_url);
                                if(thisIndex != -1) {
                                    console.log(`Removing index ${thisIndex}`)
                                    info.entries.splice(thisIndex, 1);
                                    updateMetadata(true);
                                } else console.log(`Failed to find index for ${entry.media_metadata.url.source_url}`)
                            }
        
                            //console.log(`innerFormatCard`, card.querySelector(`#innerFormatCard`))
        
                            card.querySelector(`#pausePlayButton`).classList.remove(`d-none`);
                            card.querySelector(`#pausePlayButton`).classList.add(`d-flex`);
                            card.querySelector(`#pauseicon`).classList.add(`d-none`);
                            card.querySelector(`#crossicon`).classList.remove(`d-none`);
        
                            card.querySelector(`#pausePlayButton`).onclick = () => removeCardAnim(card, removeEntry);
        
                            const nested = (entry.entries || func == `search`) ? true : false;
        
                            if(nested) {
                                if(entry.entries) card.querySelector(`#formatName`).innerHTML += ` (${info._off_platform ? getType(entry) : entry.entries.length})`;
        
                                card.querySelector(`#downloadicon`).style.transform = `rotate(270deg)`;
                                // make arrow point right
                            
                                //highlightButton(card.querySelector(`#formatDownload`), colorScheme)
        
                                card.querySelector(`#formatDownload`).onclick = () => throwToURL(null, card, entry);
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
        
                                    qualityButtons({ node: card.querySelector(`#innerFormatCard`), info: entry, card, removeEntry: () => removeEntry(), colorScheme });
                                }
        
                                //console.log(`running conversionOptions`)
            
                                conversionOptions(card, Object.assign({}, info, entry), colorScheme)
                            }
        
                            let visible = false;
        
                            const onVisibility = () => {
                                if(!visible) {
                                    visible = true;
        
                                    if(card && card.parentElement) {
                                        console.log(`card ${entry.media_metadata.url.source_url} visibility event`)
            
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
                        if(info.formats.filter(f => f.audio).length == 0 && listbox.querySelector(`#downloadBestAudio`)) listbox.querySelector(`#downloadBestAudio`).classList.add(`d-none`);
                        if(info.formats.filter(f => f.video).length == 0 && listbox.querySelector(`#downloadBestVideo`)) listbox.querySelector(`#downloadBestVideo`).classList.add(`d-none`);
                        
                        for (const i in info.formats) {
                            const format = Object.assign({}, info, info.formats[i], {entries: null, formats: null});
        
                            parseProgress.setProgress((i/info.formats.length)*100, `Parsing format ${i}/${info.formats.length}`);
        
                            //console.log(format)
                            const formatDownloadType = format.audio && format.video ? `both` : format.audio && !format.video ? `audio` : `video`;
        
                            const card = formatCard.cloneNode(true);
        
                            /*new Draggable({
                                node: card,
                                allowPopout: false,
                            })*/
        
                            const saveOptions = listboxTemplate.querySelector(`#saveOptions`).cloneNode(true)
        
                            card.querySelector(`#innerFormatCard`).appendChild(saveOptions)
        
                            const formatName = card.querySelector(`#formatName`);
        
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
                                //card.querySelector(`#outputExtension`).classList.add(`d-none`);
                            } else {
                                card.querySelector(`#videoIcon`).style.opacity = `35%`;
                                saveOptions.querySelector(`#videoOptions`).classList.add(`d-none`)
                            }
        
                            card.querySelector(`#outputExtension`).placeholder = `${format.ext}`;
                            //card.querySelector(`#saveLocation`).value = `${config && config.saveLocation ? config.saveLocation : `{default save location}`}`;
                            card.querySelector(`#basedir`).innerText = `${info.saveLocation || (config && config.saveLocation ? config.saveLocation : `Save Location`)}`;
        
                            console.log(config, config.lastMediaConversionOutputs, formatDownloadType)
        
                            if(config.lastMediaConversionOutputs[formatDownloadType]) card.querySelector(`#outputExtension`).value = config.lastMediaConversionOutputs[formatDownloadType];
        
                            const btn = card.querySelector(`#formatDownload`);
                            
                            const confirmDownload = () => {
                                saveOptionsAnimations.fadeOut(btn, saveOptions, btnClick);
        
                                btn.disabled = true;
        
                                card.style.opacity = 0.5;
        
                                console.log(format.format_id)
        
                                startDownload(card, getSaveOptions(card, format))
                            }
        
                            //card.querySelector(`#convertDownload`).parentElement.removeChild(card.querySelector(`#convertDownload`));
                            //card.querySelector(`#confirmDownload`).style.width = `100%`
        
                            card.querySelector(`#conversionDiv`).appendChild(card.querySelector(`#outputExtension`));
        
                            conversionOptions(card.querySelector(`#innerFormatCard`), format, colorScheme);
        
                            //card.querySelector(`#confirmDownload-2`).onclick = () => send({ card, node: card.querySelector(`#qualityButtons`), info, centerURLBox })
        
                            if(card.querySelector(`#confirmDownload-2`)) card.querySelector(`#confirmDownload-2`).onclick = () => confirmDownload();
                            
                            if(card.querySelector(`#confirmDownload`)) card.querySelector(`#confirmDownload`).onclick = () => confirmDownload();
        
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
                        };
                    }
        
                    if(info.entries) {
                        qualityButtons({ card: listbox, node: listbox.querySelector(`#qualityButtons`), info, centerURLBox, colorScheme });
                    } else {
                        qualityButtons({ card: listbox.querySelector(`#qualityButtons`), node: listbox.querySelector(`#qualityButtons`), info, colorScheme });
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
        
                    let disableAlbumSave = false;
        
                    const saveAsAlbum = listbox.querySelector(`#opt-saveAsAlbum`);
        
                    if(!info.entries) disableAlbumSave = true;
                    if(func == `search`) disableAlbumSave = true;
                    if(info.extractor.includes(`search`)) disableAlbumSave = true;
        
                    let n = 0;
        
                    if(disableAlbumSave && saveAsAlbum && saveAsAlbum.parentElement) listbox.querySelectorAll(`#opt-saveAsAlbum`).forEach(n => {
                        try {
                            n.remove()
                            n++;
                        } catch(e) {}
                    });
        
                    console.log(`disable album save: ${disableAlbumSave}; removed: ${n}`)
                }
            
                mainInput.enable();
            }
        
            let parse = false;
        
            const runParse = (from) => {
                console.log(`parseInfo: check completed: ${from}`)
                if(parse) {
                    parseInfo();
                } else {
                    parse = true;
                }
            }
        
            if(url && typeof url == `object`) {
                info = url;
                url = info._request_url || info.media_metadata.url.source_url || info.media_metadata.url || info.url;
                clearSearchTags(container);
                runParse(`url is object`)
            } else {
                const urls = [url, ...getSearchTags()].filter(o => o);

                let opt = {
                    query: urls.length < 2 ? urls[0] : urls,
                    extraArguments: extraArguments.value || ``
                };
            
                if(func == `search`) {
                    if(selectedSearch) opt.from = selectedSearch;
                    if(parseInt(resultsCountInput.value)) opt.count = parseInt(resultsCountInput.value);
                }

                if(lastSearch == url) opt.force = true;

                lastSearch = url;
            
                console.log(`selectionBox / hiding from parseinfo`)
                selectionBox.hide(false, true);

                console.log(`urls`, urls, `opt`, opt)
            
                mainQueue[func || `getInfo`](opt).then(data => {
                    info = data;
            
                    console.log(`info received`)
            
                    runParse(`queue function`)
                });
            }
            
            button.disabled = true;
        
            if(!container.querySelector(`#errorMsg`).classList.contains(`d-none`)) {
                container.querySelector(`#errorMsg`).classList.add(`d-none`);
            }
        
            centerURLBox(true).then(() => runParse(`centerURLBox`));
        }
        
        const resultsCountInput = container.querySelector(`#resultsCountInput`);
        
        const setSearchBtn = (btn, enabled, noAnim) => {
            anime.remove(btn)
            let duration = noAnim ? 0 : 500;
            if(enabled) {
                if(!btn.classList.contains(`ez-selected`)) btn.classList.add(`ez-selected`);
                btn.style.color = `rgb(0,0,0)`;
                anime({
                    targets: btn,
                    scale: 1.15,
                    duration: duration,
                    easing: `easeOutExpo`
                })
            } else {
                if(btn.classList.contains(`ez-selected`)) btn.classList.remove(`ez-selected`);
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
        
        const selectonBoxMargin = searchSelectionBox.style.marginTop;
        
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
        
        const processURL = () => {
            const currentSearchTags = getSearchTags(container);

            const url = input.value + currentSearchTags.reduce((a, b) => a + b, ``);
        
            if(url.length > 0) {
                const match = `${input.value}`.split(`?`)[0].match(genericURLRegex);
            
                console.log (`match`, match)
            
                if(match) {
                    runSearch(input.value, `Fetching info...`, `getInfo`)
                } else if(!match && searchTags.length > 0) {
                    if(currentSearchTags.length === 1) {
                        clearSearchTags();
                        input.value = currentSearchTags[0];
                        runSearch(input.value, `Fetching info...`, `getInfo`)
                    } else {
                        input.value = ``;
                        runSearch(``, `Fetching info...`, `getInfo`)
                    }
                } else {
                    clearSearchTags();
                    runSearch(input.value, `Running search...`, `search`)
                }
            };
        };

        tabs[`Download`].processURL = processURL;
        
        button.onclick = () => processURL();

        const pasteClick = () => {
            if(!input.disabled) navigator.clipboard.readText().then(text => {
                input.value = text;
                input.oninput();
                input.focus();
            });
        };
        
        pasteButton.onclick = pasteClick
        
        const refreshSelectionBox = () => {
            if(!progressObj) {
                const icon = pasteButton.querySelector(`#icon`);

                console.log(`plus icon classname`, icon.className)

                selectionBox.show(null, false);

                if(input.value.split(`?`)[0].match(genericURLRegex) && input.value.length > 0) {
                    console.log(`matches url`)
                    selectionBox.hide(null, false);

                    if(icon.className != `fas fa-plus-circle`) {
                        icon.className = `fas fa-plus-circle`;
                        pasteButton.onclick = () => {
                            console.log(`paste button clicked with plus icon -- ${input.disabled}`)
                            if(!input.disabled) {
                                const result = addURL(input.value)
                                if(result) {
                                    console.log(`added url (result: ${result})`)
                                    input.value = ``;
                                    refreshSelectionBox();
                                } else console.log(`failed to add url (result: ${result})`)
                            }
                        }
                    }
                } else {
                    console.log(`does not match url`)
                    selectionBox.show(null, false);

                    if(icon.className != `far fa-clipboard`) {
                        icon.className = `far fa-clipboard`;
                        pasteButton.onclick = pasteClick;
                    }
                }
            }
        }

        const addURL = (str) => {
            try {
                const url = new URL(str);

                console.log(`url:`, url)

                let afterHostname = url.pathname + (url.search || ``);

                if(afterHostname.length > 15) afterHostname = url.pathname + `?...`

                if(afterHostname.length > 15) afterHostname = afterHostname.slice(0, 15) + `...`

                const args = { url: str, name: (url.hostname.split(`.`).slice(-2)[0]) + `: ` + afterHostname }

                createSearchTag(args);
                
                return true;
            } catch(e) {
                console.error(`addURL: ${e}`)
                return false;
            }
        }
        
        const inputs = [input, extraArguments];
        
        inputs.forEach(inp => {
            inp.addEventListener(`input`, () => {
                changesMadeToInput = true;
                centerURLBox(true);
                refreshSelectionBox();
            });
        
            inp.oninput = () => {
                changesMadeToInput = true;
                centerURLBox(true);
                refreshSelectionBox();
            }
            
            inp.addEventListener(`click`, refreshSelectionBox);
            inp.addEventListener(`blur`, () => setTimeout(() => !changesMadeToInput ? selectionBox.hide(null, true) : null, 100));
            //inp.addEventListener(`focus`, () => !changesMadeToInput ? selectionBox.hide(null, true) : null);
            
            inp.addEventListener(`keyup`, (e) => {
                if(input.disabled) return;

                const enter = (e.key == `Enter` || e.keyCode == 13);

                if(enter && (e.shiftKey || (navigator.platform.startsWith(`Mac`) ? e.metaKey : e.altKey))) {
                    if(addURL(input.value)) {
                        input.value = ``;
                        refreshSelectionBox();
                    }
                } else if(enter) processURL();
            });
        });

        extraArguments.addEventListener(`blur`, () => {
            configuration.set(`ytdlpExtraArgs`, { args: extraArguments.value });
        });

        configuration.get(`ytdlpExtraArgs`).then(({ args }) => {
            if(!extraArguments.value) extraArguments.value = args;
        })
            
        resultsCountInput.addEventListener(`keyup`, (e) => {
            if(e.key == `Enter` || e.keyCode == 13) processURL();
        });
    }
}