var start = () => () => {
    if(document.getElementById('downloadsList') && document.getElementById('downloadsIcon')) {
        let currentDownloads = 0
        
        const downloadsList = document.getElementById('downloadsList');
        const downloadsIcon = document.getElementById('downloadsIcon').cloneNode(true);
        
        let queueUpdates = [];
        
        mainQueue.queueUpdate((m) => {
            if(m.type == `queue`) {
                console.log(m.data)
            
                const queueLength = m.data.active.length + m.data.queue.length + m.data.paused.length;
            
                currentDownloads = queueLength
            
                if(queueLength > 0) {
                    if(downloadsList.querySelector(`#downloadsIcon`)) {
                        downloadsList.removeChild(downloadsList.querySelector(`#downloadsIcon`))
                    };
            
                    downloadsList.innerHTML = `${queueLength}`
                } else {
                    downloadsList.innerHTML = ``;
                    
                    if(!downloadsList.querySelector(`#downloadsIcon`)) {
                        downloadsList.appendChild(downloadsIcon)
                    };
                };
            }
        })
        
        if(document.body.querySelector(`#urlBox`)) {
            const downloadsQueue = formatListTemplate.cloneNode(true);
            downloadsQueue.querySelector(`#formatCard`).parentNode.removeChild(downloadsQueue.querySelector(`#formatCard`));
            
            downloadsQueue.style.maxHeight = `max(calc(100vh - ${document.getElementById(`navigationBar`).offsetHeight}px - 20px), 500px)`;
            downloadsQueue.style.overflowY = `scroll`;
            
            const queueMaxHeight = downloadsQueue.style.maxHeight
            
            downloadsQueue.style.paddingLeft = `20px`
            downloadsQueue.style.paddingRight = `20px`
            
            const downloadCard = formatListTemplate.querySelector(`#formatCard`).cloneNode(true);
            downloadCard.querySelector(`#formatSubtext`).classList.remove(`d-none`);
            
            //downloadCard.querySelector(`#formatMetaList`).classList.add(`d-none`);
            
            const platform = navigator.platform.toLowerCase();
            
            const downloadCardStates = {
                reset: (card) => {
                    card.style.opacity = 1;
                    if(!card.querySelector(`#pausePlayButton`).classList.contains(`d-none`)) card.querySelector(`#pausePlayButton`).classList.add(`d-none`);
            
                    card.querySelectorAll(`.icon`).forEach(icon => {
                        if(!icon.classList.contains(`d-none`)) icon.classList.add(`d-none`)
                    });
            
                    card.querySelector(`#downloadicon`).classList.remove(`d-none`);
                    card.querySelector(`#pauseicon`).classList.remove(`d-none`);
            
                    card.querySelector(`#formatDownload`).onclick = () => {};
                    if(card.querySelector(`#formatDownload`).classList.contains(`d-none`)) card.querySelector(`#formatDownload`).classList.remove(`d-none`);
            
                    card.querySelector(`#pausePlayButton`).onclick = () => {};
                    if(!card.querySelector(`#pausePlayButton`).classList.contains(`d-none`)) card.querySelector(`#pausePlayButton`).classList.add(`d-none`);
                },
                complete: (card) => {
                    downloadCardStates.reset(card);
            
                    card.style.opacity = 0.5;
                    
                    card.querySelector(`#downloadicon`).classList.add(`d-none`);
                    card.querySelector(`#checkmarkicon`).classList.remove(`d-none`);
            
                    const clear = () => {
                        mainQueue.action({
                            action: `remove`,
                            id: card.id.split(`-`)[1]
                        })
                    };
                    const btn2 = card.querySelector(`#pausePlayButton`);
            
                    card.querySelector(`#fileicon`).classList.remove(`d-none`);
                    card.querySelector(`#pauseicon`).classList.add(`d-none`);
            
                    btn2.onclick = () => mainQueue.openDir(card.id.split(`-`)[1]);
            
                    btn2.classList.remove(`d-none`);
                    btn2.classList.add(`d-flex`);
                    
                    card.querySelector(`#formatDownload`).onclick = clear
                },
                active: (card) => {
                    downloadCardStates.reset(card);
            
                    //card.querySelector(`#pausePlayButton`).classList.remove(`d-none`)
                    // wip
            
                    card.querySelector(`#downloadicon`).classList.add(`d-none`);
                    card.querySelector(`#stopicon`).classList.remove(`d-none`);
            
                    if(platform == `win32`) card.querySelector(`#formatDownload`).classList.add(`d-none`)
            
                    card.querySelector(`#formatDownload`).onclick = () => {
                        mainQueue.action({
                            action: `cancel`,
                            id: card.id.split(`-`)[1]
                        })
                    }
                    
                    card.querySelector(`#pausePlayButton`).onclick = () => {
                        mainQueue.action({
                            action: `pause`,
                            id: card.id.split(`-`)[1]
                        })
                    }
                },
                paused: (card) => {
                    downloadCardStates.reset(card);
            
                    card.querySelector(`#pausePlayButton`).classList.remove(`d-none`)
            
                    card.querySelector(`#downloadicon`).classList.add(`d-none`);
                    card.querySelector(`#stopicon`).classList.remove(`d-none`);
                    
                    if(platform == `win32`) card.querySelector(`#formatDownload`).classList.add(`d-none`)
            
                    card.querySelector(`#formatDownload`).onclick = () => {
                        mainQueue.action({
                            action: `cancel`,
                            id: card.id.split(`-`)[1]
                        })
                    }
                    
                    card.querySelector(`#pauseicon`).classList.add(`d-none`);
                    card.querySelector(`#playicon`).classList.remove(`d-none`);
                    
                    card.querySelector(`#pausePlayButton`).onclick = () => {
                        mainQueue.action({
                            action: `resume`,
                            id: card.id.split(`-`)[1]
                        })
                        downloadCardStates.active(card);
                    }
                },
                queue: (card) => {
                    downloadCardStates.reset(card);
            
                    card.querySelector(`#formatDownload`).onclick = () => {
                        mainQueue.action({
                            action: `start`,
                            id: card.id.split(`-`)[1]
                        });
                        downloadCardStates.active(card);
                    }
            
                    card.querySelector(`#crossicon`).classList.remove(`d-none`);
                    card.querySelector(`#pauseicon`).classList.add(`d-none`);
            
                    card.querySelector(`#pausePlayButton`).classList.remove(`d-none`);
            
                    card.querySelector(`#pausePlayButton`).onclick = () => {
                        mainQueue.action({
                            action: `remove`,
                            id: card.id.split(`-`)[1]
                        })
                    }
                },
            }
            
            downloadsQueue.id = `downloadsQueue`;
            
            if(downloadsQueue.classList.contains(`d-none`)) downloadsQueue.classList.remove(`d-none`);
            if(downloadsQueue.classList.contains(`d-flex`)) downloadsQueue.classList.remove(`d-flex`);
            
            //downloadsQueue.classList.add(`d-none`)
            
            downloadsQueue.style.maxHeight = `0px`
            
            downloadsQueue.style.position = `fixed`;
            downloadsQueue.style[`backdrop-filter`] = `blur(15px)`;
            
            //downloadsQueue.style.bottom = window.innerHeight;
            
            //downloadsQueue.classList.add(`d-flex`);
            
            downloadsQueue.style.top = `-99999px`
            downloadsQueue.style.right = `10px`;
        
            const pageButtons = listboxTemplate.querySelector(`#innerQualityButtons`).cloneNode(true);
            pageButtons.querySelector(`#downloadBest`).innerHTML = ``;
        
            const pageBtn = pageButtons.querySelector(`#downloadBest`).cloneNode(true);
        
            pageButtons.querySelectorAll(`.downloadBestFormat`).forEach(b => b.parentNode.removeChild(b));
            
            const clearQueueDiv = pageButtons.cloneNode(true);
        
            const previousPage = pageBtn.cloneNode(true);
            previousPage.innerHTML = `Previous`;
            pageButtons.appendChild(previousPage);
        
            const pageNumText = document.createElement(`h6`);
            pageNumText.style.color = `white`
            pageNumText.innerHTML = `Page 1/1`;
            pageButtons.appendChild(pageNumText);
        
            const nextPage = pageBtn.cloneNode(true);
            nextPage.innerHTML = `Next`;
            pageButtons.appendChild(nextPage);
        
            downloadsQueue.appendChild(pageButtons);
        
            clearQueueDiv.style.marginTop = `7px`;
        
            const clearCompletedButton = pageBtn.cloneNode(true);
            clearCompletedButton.innerHTML = `Clear Completed`;
            clearQueueDiv.appendChild(clearCompletedButton);
        
            const clearQueueButton = pageBtn.cloneNode(true);
            clearQueueButton.innerHTML = `Clear Queue`;
            clearQueueDiv.appendChild(clearQueueButton);
        
            downloadsQueue.appendChild(clearQueueDiv);
            
            const navigationBar = document.querySelector(`#navigationBar`);
            
            document.body.appendChild(downloadsQueue);
            
            downloadsQueue.after(navigationBar);
            
            const downloadManagers = {};
            
            let observerEnabled = false;
            
            const observer = new ResizeObserver(() => {
                if(observerEnabled) repositionNotifications(downloadsQueue.getBoundingClientRect().height, true)
            }).observe(downloadsQueue);
        
            let totalQueue = [], order = [], pageNum = 0, totalPages = 0, cardsPerPage = 5;
        
            let firstRefresh = true;
        
            const refreshListView = () => {
                console.log(`refreshing list view`)
        
                let queue = totalQueue.slice(pageNum * cardsPerPage, (pageNum + 1) * cardsPerPage);
        
                downloadsQueue.querySelectorAll(`.card`).forEach(card => {
                    if(!queue.find(o => o.id == card.id.split(`-`)[1])) {
                        if(downloadManagers[card.id.split(`-`)[1]]) delete downloadManagers[card.id.split(`-`)[1]];
                        card.parentNode.removeChild(card);
                    }
                });
        
                for (i in queue) {
                    const o = queue[i];
        
                    let card = document.getElementById(`download-${o.id}`);
        
                    if(!card) {
                        card = downloadCard.cloneNode(true)
                        card.id = `download-${o.id}`;
        
                        let title = `[${o.opt.format}] `;
        
                        console.log(o.opt)
        
                        if(o.opt.info) {
                            if(o.opt.info.webpage_url_domain) title += "[" + o.opt.info.webpage_url_domain + "]";
                            if(o.opt.info.title) title += o.opt.info.title;
                        } else {
                            title += o.opt.url;
                        }
        
                        card.querySelector(`#formatName`).innerHTML = title;
        
                        card.querySelector(`#formatMetaList`).classList.add(`d-none`)
                        card.querySelector(`#mediaIcons`).classList.add(`d-none`)
        
                        const downloadManager = createDownloadManager(card, o.id);
                        downloadManagers[o.id] = downloadManager;
                        
                        downloadManagers[o.id].update(o.status);
                    }
        
                    if(!document.querySelector(`#download-${o.id}`)) downloadsQueue.appendChild(card);
        
                    if(!card.classList.contains(`queue-${o.state}`)) {
                        if(`${card.classList}`.includes(`queue-`)) console.log(`new state: ${o.state}, previous state: ${`${card.classList}`.split(`queue-`)[1].split(` `)[0]}`)
                        
                        for (state of order) {
                            if(card.classList.contains(`queue-${state}`)) card.classList.remove(`queue-${state}`)
                        }
        
                        if(downloadCardStates[o.state]) {
                            downloadCardStates[o.state](card);
                        } else {
                            console.log(`NO DOWNLOAD CARD STATE FOR ${o.state} -- CARD ID ${card.id} LEFT AS IS`)
                        }
                        
                        //if(o.state == `complete` && !downloadsQueueToggled && firstRefresh) createNotification(card, clear)
        
                        card.classList.add(`queue-${o.state}`)
        
                        const selector = downloadsQueue.querySelectorAll(`.queue-${o.state}`)
                        const insertAfter = selector.item(selector.length - 1)
                        card.after(insertAfter)
                    }
                }
        
                firstRefresh = false;
            };
        
            const updateButtonStates = (disableAnyways) => {
                console.log(`updating button states`)
        
                pageNumText.innerHTML = `Page ${pageNum + 1}/${totalPages + 1}`;
        
                if(pageNum == 0 || disableAnyways) {
                    previousPage.opacity = 0.5;
                    previousPage.disabled = true;
                } else {
                    previousPage.opacity = 1;
                    previousPage.disabled = false;
                }
        
                if(pageNum == totalPages || disableAnyways) {
                    nextPage.opacity = 0.5;
                    nextPage.disabled = true;
                } else {
                    nextPage.opacity = 1;
                    nextPage.disabled = false;
                }
        
                if(totalQueue.filter(o => o.state == `complete`).length > 0 && !disableAnyways) {
                    clearCompletedButton.opacity = 1;
                    clearCompletedButton.disabled = false;
                } else {
                    clearCompletedButton.opacity = 0.5;
                    clearCompletedButton.disabled = true;
                }
        
                if(totalQueue.filter(o => o.state != `active` && o.state != `paused` && o.state != `complete`).length > 0 && !disableAnyways) {
                    clearQueueButton.opacity = 1;
                    clearQueueButton.disabled = false;
                } else {
                    clearQueueButton.opacity = 0.5;
                    clearQueueButton.disabled = true;
                }
            }
        
            const pageSwitchButtonClick = (arg) => {
                if(pageNum + arg < 0 && pageNum + arg > totalPages) {
                    console.log(`invalid page number: ${pageNum + arg}/${totalPages} (previous: ${pageNum})`)
                } else {
                    console.log(`page number: ${pageNum + arg}/${totalPages} (previous: ${pageNum})`);
                    pageNum += arg;
                    refreshListView();
                };
        
                updateButtonStates();
            }
        
            previousPage.onclick = () => pageSwitchButtonClick(-1);
            nextPage.onclick = () => pageSwitchButtonClick(1);
        
            const clearFromQueue = async (queue) => mainQueue.action({ action: `remove`, id: queue.map(o => o.id) });
        
            clearCompletedButton.onclick = () => clearFromQueue(totalQueue.filter(o => o.state == `complete`))
            clearQueueButton.onclick = () => clearFromQueue(totalQueue.filter(o => o.state != `active` && o.state != `paused` && o.state != `complete`));
        
            mainQueue.queueUpdate((m) => {
                if(m.type == `queue`) {
                    console.log(m)
        
                    totalQueue = [];
            
                    order = Object.keys(m.data)
                    order.push(order.shift()); // put complete at the bottom of the list
            
                    for (state of order) totalQueue.push(...m.data[state].map(o => Object.assign({}, o, {state})))
        
                    totalPages = Math.floor(totalQueue.length / cardsPerPage)
        
                    updateButtonStates();
                    refreshListView();
                } else {
                    if(downloadManagers[m.data.id]) downloadManagers[m.data.id].update(m.data.status);
                }
            });
            
            let downloadsQueueToggled = false;
            
            downloadsList.onclick = () => {
                anime.remove(downloadsQueue);
            
                downloadsQueue.style.maxHeight = queueMaxHeight;
            
                const currentHeight = downloadsQueue.getBoundingClientRect().height
            
                const arr = [document.getElementById(`navigationBar`).getBoundingClientRect().height - 150, document.getElementById(`navigationBar`).getBoundingClientRect().height]
            
                if(!downloadsQueueToggled) {
                    console.log(`sliding in`)
            
                    observerEnabled = true;
            
                    repositionNotifications(currentHeight, true)
            
                    downloadsList.style.background = `rgba(255,255,255,1)`;
                    downloadsList.style.color = `rgba(0,0,0,1)`;
            
                    anime({
                        targets: downloadsQueue,
                        top: arr,
                        duration: 500,
                        easing: `easeOutExpo`,
                    });
                } else {     
                    console.log(`sliding out`)       
            
                    downloadsList.style.background = `rgba(25,25,25,0.3)`;
                    downloadsList.style.color = `rgba(255,255,255,1)`;
            
                    observerEnabled = false;
                    
                    repositionNotifications(0, true)
            
                    anime({
                        targets: downloadsQueue,
                        top: arr.slice(0).reverse(),
                        maxHeight: [`${currentHeight}px`, `20px`],
                        duration: 500,
                        easing: `easeOutExpo`,
                    });
                }
            
                downloadsQueueToggled = !downloadsQueueToggled;
            }
        } else {
            downloadsList.disabled = true;
            downloadsList.opacity = 0.75;
        };
        
        mainQueue.refreshUpdates()
    }
}

if(typeof preload != `undefined`) {
    preload.oncomplete(start);
} else document.addEventListener(`DOMContentLoaded`, start)