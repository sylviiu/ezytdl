const downloadsWs = new WebSocket(`ws://localhost:3000/download`);

const downloadsList = document.getElementById('downloadsList');
const downloadsIcon = document.getElementById('downloadsIcon').cloneNode(true);

const downloadsQueue = formatListTemplate.cloneNode(true);
downloadsQueue.querySelector(`#formatCard`).parentNode.removeChild(downloadsQueue.querySelector(`#formatCard`));

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
        
        card.querySelector(`#formatDownload`).onclick = () => {
            downloadsWs.send(JSON.stringify({
                action: `remove`,
                id: card.id.split(`-`)[1]
            }))
        }
    },
    active: (card) => {
        downloadCardStates.reset(card);

        //card.querySelector(`#pausePlayButton`).classList.remove(`d-none`)
        // wip

        card.querySelector(`#downloadicon`).classList.add(`d-none`);
        card.querySelector(`#stopicon`).classList.remove(`d-none`);

        if(platform == `win32`) card.querySelector(`#formatDownload`).classList.add(`d-none`)

        card.querySelector(`#formatDownload`).onclick = () => {
            downloadsWs.send(JSON.stringify({
                action: `cancel`,
                id: card.id.split(`-`)[1]
            }))
        }
        
        card.querySelector(`#pausePlayButton`).onclick = () => {
            downloadsWs.send(JSON.stringify({
                action: `pause`,
                id: card.id.split(`-`)[1]
            }))
        }
    },
    paused: (card) => {
        downloadCardStates.reset(card);

        card.querySelector(`#pausePlayButton`).classList.remove(`d-none`)

        card.querySelector(`#downloadicon`).classList.add(`d-none`);
        card.querySelector(`#stopicon`).classList.remove(`d-none`);
        
        if(platform == `win32`) card.querySelector(`#formatDownload`).classList.add(`d-none`)

        card.querySelector(`#formatDownload`).onclick = () => {
            downloadsWs.send(JSON.stringify({
                action: `cancel`,
                id: card.id.split(`-`)[1]
            }))
        }
        
        card.querySelector(`#pauseicon`).classList.add(`d-none`);
        card.querySelector(`#playicon`).classList.remove(`d-none`);
        
        card.querySelector(`#pausePlayButton`).onclick = () => {
            downloadsWs.send(JSON.stringify({
                action: `resume`,
                id: card.id.split(`-`)[1]
            }))
            downloadCardStates.active(card);
        }
    },
    queue: (card) => {
        downloadCardStates.reset(card);

        card.querySelector(`#formatDownload`).onclick = () => {
            downloadsWs.send(JSON.stringify({
                action: `start`,
                id: card.id.split(`-`)[1]
            }));
            downloadCardStates.active(card);
        }

        card.querySelector(`#crossicon`).classList.remove(`d-none`);
        card.querySelector(`#pauseicon`).classList.add(`d-none`);

        card.querySelector(`#pausePlayButton`).classList.remove(`d-none`);

        card.querySelector(`#pausePlayButton`).onclick = () => {
            downloadsWs.send(JSON.stringify({
                action: `remove`,
                id: card.id.split(`-`)[1]
            }))
        }
    },
}

downloadsQueue.id = `downloadsQueue`;

if(downloadsQueue.classList.contains(`d-none`)) downloadsQueue.classList.remove(`d-none`);
if(downloadsQueue.classList.contains(`d-flex`)) downloadsQueue.classList.remove(`d-flex`);

downloadsQueue.classList.add(`d-none`)

downloadsQueue.style.position = `fixed`;
downloadsQueue.style[`backdrop-filter`] = `blur(15px)`;

//downloadsQueue.style.bottom = window.innerHeight;

downloadsQueue.classList.add(`d-flex`);

downloadsQueue.style.top = `80px`
downloadsQueue.style.right = `10px`;

document.body.appendChild(downloadsQueue);

const downloadManagers = {};

downloadsWs.onopen = () => {
    downloadsWs.send(`queue`);
};

downloadsWs.onmessage = (msg) => {
    const m = JSON.parse(msg.data.toString());

    if(m.type == `queue`) {
        const queueLength = m.data.active.length + m.data.queue.length;
    
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

        const queue = [];

        const order = Object.keys(m.data)

        for (state of order) {
            queue.push(...m.data[state].map(o => Object.assign({}, o, {state})))
        };

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

                const downloadManager = createDownloadManager(card);
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

                card.classList.add(`queue-${o.state}`)

                const selector = downloadsQueue.querySelectorAll(`.queue-${o.state}`)
                const insertAfter = selector.item(selector.length - 1)
                card.after(insertAfter)
            }
        }
    } else if(m.type == `update`) {
        //console.log(m.data)

        if(downloadManagers[m.data.id]) downloadManagers[m.data.id].update(m.data.status);
    }
};

let downloadsQueueToggled = downloadsQueue.classList.contains(`d-none`);

downloadsList.onclick = () => {
    anime.remove(downloadsQueue);
    
    if(downloadsQueue.classList.contains(`d-none`)) downloadsQueue.classList.remove(`d-none`);

    const arr = [0 - Number(downloadsQueue.style.minWidth.replace(`px`, ``)), `10px`]

    if(downloadsQueueToggled) {
        console.log(`sliding in`)
        anime({
            targets: downloadsQueue,
            right: arr,
            duration: 1000,
            easing: `easeOutExpo`,
        });
    } else {     
        console.log(`sliding out`)       
        anime({
            targets: downloadsQueue,
            right: arr.slice(0).reverse(),
            duration: 1000,
            easing: `easeOutExpo`,
            finished: () => {
                downloadsQueue.classList.add(`d-none`);
            }
        });
    }

    downloadsQueueToggled = !downloadsQueueToggled;
}