tabs[`Convert`] = {
    name: `Convert`,
    icon: `arrow-alt-circle-right`,
    container: null,
    colorScheme: 1,
    canSwitch: () => new Promise(res => {
        system.hasFFprobe().then(r => {
            res(r);
            if(!r) createNotification({
                type: `error`,
                headingText: `FFprobe (from FFmpeg) not found!`,
                bodyText: `FFprobe was not found on your system. Please install FFmpeg through the app settings (or system-wide with FFprobe), and try again.`,
                hideReportButton: true,
                redirect: `settings.html`,
                redirectMsg: `Go to settings`
            })
        })
    }),
    initializePage: (container, { setBackground, wavesAnims, colorScheme }) => {
        const urlBox = container.querySelector(`#urlBox`);
        const innerUrlBox = container.querySelector(`#innerUrlBox`);

        const button = container.querySelector(`#urlEnter`);

        const openFileButton = createButton(`openFile`, {
            icon: `file`,
            label: `Select files...`,
            primaryColor: true,
        }, { paddingLeft: `30px`, paddingRight: `30px` });

        const openFolderButton = createButton(`openFolder`, {
            icon: `folder`,
            label: `Open folder...`,
            primaryColor: true,
        }, { paddingLeft: `30px`, paddingRight: `30px` });
        
        const searchSelectionBox = container.querySelector(`#searchSelectionBox`);
        const innerSearchSelectionBox = container.querySelector(`#innerSelectionBox`);

        container.querySelector(`#searchBoxHeading`).innerHTML = `Or, pick a file to convert`;

        innerSearchSelectionBox.innerHTML = ``;
        innerSearchSelectionBox.appendChild(openFileButton);
        innerSearchSelectionBox.appendChild(openFolderButton);
        
        const input = container.querySelector(`#urlInput`);
        input.placeholder = config.saveLocation + `...`;

        container.querySelector(`#urlPaste`).remove();
        
        openFileButton.style.background = `rgb(${colorScheme.light.r}, ${colorScheme.light.g}, ${colorScheme.light.b})`;
        openFolderButton.style.background = `rgb(${colorScheme.light.r}, ${colorScheme.light.g}, ${colorScheme.light.b})`;
        
        const mediaMetaItem = container.querySelector(`#mediaMetaItem`).cloneNode(true);
        container.querySelector(`#mediaMetaItem`).parentNode.removeChild(container.querySelector(`#mediaMetaItem`));
        
        const listboxParent = container.querySelector(`#listbox`).parentElement;
        
        container.querySelector(`#advancedOptions`).remove();
        
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
        
        let resultsVisible = false;
        
        let existingCenterBoxPromise = null;
        let centerURLBox = () => existingCenterBoxPromise ? existingCenterBoxPromise : new Promise(r => {
            if(!container.querySelector(`#listbox`)) return r(false);
            r(false)
        });

        searchTagsEditCallback(container, () => centerURLBox(true))
        
        const runSearch = async (url, initialMsg, func=`ffprobe`) => {
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
                    
                        if(config.animations.reduceAnimations) {
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
                    
                        if(config.animations.disableAnimations) {
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
        
                    button.disabled = false;
                    
                    if(config.animations.disableAnimations) {
                        input.value = url;
                        runSearch(input.value, `Fetching info...`, `ffprobe`)
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
                            runSearch(entry, `Reading entry...`, `ffprobe`)
                        } else {
                            runSearch(url, `Fetching info...`, `ffprobe`)
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
                                    //runSearch(entry, `Reading entry...`, `ffprobe`)
                                    //input.value = entry.webpage_url || entry.url;
                                    //runSearch(input.value, `Fetching info...`, `ffprobe`)
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

                    const splitType = `${info.extractor_key || info.extractor || info.webpage_url_domain}`.split(/(?=[A-Z])/);
        
                    let type = splitType.slice(0, -1).join(``);
                    let icon;

                    info._ezytdl_ui_icon = `arrow-alt-circle-right`;
                    info._ezytdl_ui_type = `Convert`;
                    info._ezytdl_ui_title = `Converted from ${url}`;
        
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
                    };
        
                    const getIcon = (entry) => {
                        switch(typeof entry == `object` ? entry.ezytdl_type : ``) {
                            case `user`:
                                return `fa-user-circle`;
                            case `playlist`:
                                return `fa-list`;
                            case `video`:
                                return `fa-video`;
                            case `audio`:
                                return `fa-music`;
                            case `media`:
                                return `fa-play-circle`;
                            default:
                                return `fa-link`;
                        }
                    }
        
                    if(!icon && info.webpage_url_domain) setIcon(info.webpage_url_domain.split(`.`).slice(-2, -1)[0].toLowerCase(), `webpage_url_domain`);
                    if(!icon && info.extractor) setIcon(info.extractor.split(`:`)[0].toLowerCase(), `extractor`, info.extractor.split(`:`).slice(1).map(s => s[0].toUpperCase() + s.slice(1)).join(` `));
                    if(!icon) setIcon(type.toLowerCase(), type);
                    if(!icon) setIcon(type.split(/(?=[A-Z])/)[0].toLowerCase(), `"${type}" split by capital letters`, type.split(/(?=[A-Z])/).slice(1).join(``));
                    if(!icon && info.webpage_url_domain && info.webpage_url_domain.split(`.`).slice(-2, -1)[0].toLowerCase().endsWith(`app`)) setIcon(info.webpage_url_domain.split(`.`).slice(-2, -1)[0].toLowerCase().slice(0, -3), `webpage_url_domain (without app at end)`);
        
                    if(icon) listbox.querySelector(`#mediaTitle`).appendChild(icon);
        
                    listbox.querySelector(`#mediaTitle`).innerHTML += `${info.media_metadata.general.title}`;
        
                    const updateMetadata = async (parse) => {
                        if(parse) info = await mainQueue.parseInfo(info);
        
                        let afterType = ` ${splitType[splitType.length - 1]}`;
        
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
                                } else if(i == parsableArtists.length - 1 && more == 0) {
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
        
                        listbox.querySelector(`#mediaSubtext`).innerHTML = ((type || ``)).trim();
        
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
                                card.querySelector(`#linkIcon`).classList.remove(`fa-link`);
                                card.querySelector(`#linkIcon`).classList.add(getIcon(entry));
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
        
                            if(entry.entries) card.querySelector(`#formatName`).innerHTML += ` (${entry.entries.length})`;
        
                            card.querySelector(`#downloadicon`).style.transform = `rotate(270deg)`;

                            card.querySelector(`#formatDownload`).onclick = () => throwToURL(null, card, entry);
        
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
        
                            card.querySelector(`#conversionDiv`).appendChild(card.querySelector(`#outputExtension`));
        
                            conversionOptions(card.querySelector(`#innerFormatCard`), format, colorScheme);
        
                            if(card.querySelector(`#confirmDownload-2`)) card.querySelector(`#confirmDownload-2`).onclick = () => confirmDownload();
        
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
        
                    setupConvertDownload(listbox.querySelector(`#qualityButtons`), info, colorScheme)
                    listbox.querySelector(`#confirmDownload-2`).onclick = () => send({ card: listbox.querySelector(`#qualityButtons`), node: listbox.querySelector(`#qualityButtons`), info })
        
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
        
                    if(!config.animations.reduceAnimations && !config.animations.disableAnimations) listboxParent.appendChild(listbox);
        
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
            
                button.disabled = false;
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
        
            if(url && typeof url == `object` && typeof url.length != `number`) {
                info = url;
                url = info._request_url || info.media_metadata.url.source_url || info.media_metadata.url || info.url;
                clearSearchTags(container);
                runParse(`url is object; ${url}`)
            } else {
                console.log(`running func ${func}`);

                const urls = [url, ...getSearchTags()].filter(o => o);

                mainQueue[func](urls.length < 2 ? urls[0] : urls).then(data => {
                    info = data;
            
                    console.log(`info received`)
            
                    runParse(`queue function`)
                })
            }

            button.disabled = true;
        
            if(!container.querySelector(`#errorMsg`).classList.contains(`d-none`)) {
                container.querySelector(`#errorMsg`).classList.add(`d-none`);
            }
        
            centerURLBox(true).then(() => runParse(`centerURLBox`));
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
            }
        }
        
        openFileButton.onclick = () => {
            centerURLBox(true);
            system.pickFile({ title: `Convert File`, properties: [ `openFile`, `multiSelections` ] }).then(files => {
                if(files) {
                    console.log(`files:`, files)
                    if(files.length > 1) {
                        files.forEach(file => {
                            const splitter = navigator.platform == `Win32` ? `\\` : `/`;
        
                            let name = file.split(splitter).slice(-1)[0];
        
                            if(name.length > 8) name = `${name.slice(0, 4)}...${name.slice(-4)}`
        
                            createSearchTag({ url: file, name });
                        });
                        processURL();
                    } else {
                        input.value = files[0];
                        processURL();
                    }
                }
            });
        }
        
        openFolderButton.onclick = () => {
            centerURLBox(true);
            system.pickFolder({ title: `Batch Convert` }).then(path => {
                if(path) {
                    console.log(`path:`, path)
                    input.value = path;
                    processURL();
                }
            });
        }
        
        const processURL = () => {
            const url = input.value + getSearchTags().reduce((a, b) => a + b, ``);
        
            if(url.length > 0) {        
                console.log (`clicc`, url)
            
                runSearch(input.value, `Running search...`, `ffprobe`)
            };
        }
        
        button.onclick = () => processURL();
        
        document.addEventListener(`drop`, e => {
            e.preventDefault();
            e.stopPropagation();
        
            if(e.dataTransfer.files.length > 0) {
                input.value = e.dataTransfer.files[0].path;
                processURL();
            };
        })
        
        const refreshSelectionBox = () => {
            if(!progressObj) {
                selectionBox.show(null, false);
                if(input.value.split(`?`)[0].match(genericURLRegex) && input.value.length > 0) {
                    console.log(`matches url`)
                    selectionBox.hide(null, false);
                } else {
                    console.log(`does not match url`)
                    selectionBox.show(null, false);
                }
            }
        }
        
        /*input.addEventListener(`input`, () => {
            changesMadeToInput = true;
            centerURLBox(true);
            refreshSelectionBox();
        });*/
    
        input.oninput = () => {
            changesMadeToInput = true;
            centerURLBox(true);
            refreshSelectionBox();
        }
        
        input.addEventListener(`click`, refreshSelectionBox);
        input.addEventListener(`blur`, () => setTimeout(() => !changesMadeToInput ? selectionBox.hide(null, true) : null, 100));
        //input.addEventListener(`focus`, () => !changesMadeToInput ? selectionBox.hide(null, true) : null);
        
        input.addEventListener(`keyup`, (e) => {
            if(input.disabled) return;

            const enter = (e.key == `Enter` || e.keyCode == 13);

            if(enter && (e.shiftKey || (navigator.platform.startsWith(`Mac`) ? e.metaKey : e.altKey)) && input.value) {
                try {
                    const splitter = navigator.platform == `Win32` ? `\\` : `/`;

                    let name = input.value.split(splitter).slice(-1)[0];

                    if(name.length > 8) name = `${name.slice(0, 4)}...${name.slice(-4)}`

                    createSearchTag({ url: input.value, name })

                    input.value = ``;
                } catch(e) {}
            } else if(enter) processURL();
        });
    }
}