const idGen = require(`./idGen`);

const platform = process.platform;

const { app } = require(`electron`);

const queue = {
    complete: [],
    active: [],
    paused: [],
    queue: []
};

const queueEventEmitter = new (require(`events`))();

let activeProgress = {};

let ws = {
    send: (content) => {
        if(!global.window) return;

        let c2 = content;
        if(typeof c2 == `object`) c2 = JSON.stringify(content);
        
        global.window.webContents.send(`queueUpdate`, JSON.parse(c2));
    }
};

let downloadStatusWs = {
    send: (content) => {
        if(!global.window) return;

        if(typeof content == `object`) content = JSON.stringify(content);

        global.window.webContents.send(`formatStatusUpdate`, JSON.parse(content));
    },
};
let lastDownloadStatus = null;

const sendNotification = require(`../core/sendNotification`)

let queueSizeWarningSent = false;

const updateAppBadge = () => {
    const totalItems = Object.values(queue).slice(1).reduce((a,b) => a+b.length, 0);
    
    if(totalItems == 0 && queue.complete.length > 0) {
        app.setBadgeCount();
    } else app.setBadgeCount(totalItems);

    if(!queueSizeWarningSent && totalItems > 50) {
        queueSizeWarningSent = true;

        sendNotification({
            headingText: `Warning!`,
            bodyText: `There are ${totalItems} items in the queue.\n\nDepending on your computer, having too many items in the download queue may cause the UI to slow down and/or freeze, especially if you navigate to different pages while the queue is active. To ensure stability, stay on this screen while you finish this queue.`,
            type: `warn`,
        });
    }
}

const updateProgressBar = () => {
    let value = 2;

    if(queue.active.length == 0 && queue.paused.length == 0 && queue.queue.length == 0) {
        value = -1
    } else if(queue.active.length == 1 && queue.paused.length == 0 && queue.queue.length == 0) {
        if(!queue.active[0].status || !queue.active[0].status.percentNum) {
            if(process.platform == `win32`) {
                value = 2
            } else {
                value = 0
            }
        } else {
            value = queue.active[0].status.percentNum/100;
        }
    } else {
        const progressMax = Object.values(queue).reduce((a,b) => a+b.length, 0);
        
        let progressCurrent = queue.complete.length;
        
        progressCurrent += [...queue.active, ...queue.paused].reduce((a,b) => a + b && b.status && b.status.percentNum ? b.status.percentNum/100 : 0, 0);

        const progress = progressCurrent / progressMax;

        value = progress;
    };

    if(global.window) global.window.setProgressBar(value);
};

const sendUpdate = (sendObj) => {
    //console.log(`Sending download update...`)
    if(ws) ws.send({
        type: `update`,
        data: sendObj
    })
}

const refreshQueue = (opt) => {    
    let queueModified = false;

    let removedItems = false;

    if(opt) {
        const { action, id, obj } = opt;

        if(action == `add` && obj) {
            if(obj.length && obj.length > 0) {
                console.log(`Adding ${obj.length} objects to queue...`);
                queue.queue.push(...obj);
                //console.log(queue.queue[0])
                queueModified = true;
            } else {
                console.log(`Adding ${obj.id} to queue...`)
                queue.queue.push(obj);
                queueModified = true;
            }
        } else if(action == `remove` && id) {
            if(typeof id == `object`) {    
                for (i of id) {
                    for (state of Object.keys(queue)) {
                        let o = queue[state].findIndex(e => e.id == i);
            
                        if(o != -1) {
                            if(queue[state][0].ytdlpProc && !queue[state][0].ytdlpProc.killed && queue[state][0].ytdlpProc.kill) queue[state][0].ytdlpProc.kill(9)
                            queue[state].splice(o, 1)
                            queueModified = true;
                            removedItems = true;
                        }
                    }
                }
            } else {
                for (state of Object.keys(queue)) {
                    let o = queue[state].findIndex(e => e.id == id);
        
                    if(o != -1) {
                        if(queue[state][0].ytdlpProc && !queue[state][0].ytdlpProc.killed && queue[state][0].ytdlpProc.kill) queue[state][0].ytdlpProc.kill(9)
                        queue[state].splice(o, 1)
                        queueModified = true;
                        removedItems = true;
                    }
                }
            }
        }
    }

    console.log(`Updating queue...`)

    for (o of queue.active) {
        if(o.complete) {
            const index = queue.active.findIndex(e => e.id == o.id);
            if(index != -1) {
                console.log(`Moving ${o.id} to complete (at index ${index})...`);
                queueModified = true;
                queue.complete.push(queue.active.splice(index, 1)[0]);
            } else {
                console.log(`Couldn't find ${o.id} in active queue??? Skipping...`);
            }
        } else if(o.paused) {
            const index = queue.active.findIndex(e => e.id == o.id);
            if(index != -1) {
                console.log(`Moving ${o.id} to complete (at index ${index})...`);
                queueModified = true;
                queue.paused.push(queue.active.splice(index, 1)[0]);
            } else {
                console.log(`Couldn't find ${o.id} in active queue??? Skipping...`);
            }
        }
    }

    if(queueModified) {
        const conf = require(`../getConfig`)();

        while((queue.active.length + queue.paused.length) < conf.concurrentDownloads && queue.queue.length > 0) {
            const next = queue.queue.shift();
            queue.active.push(next);
            //console.log(next)
            next.start();
        };

        if(queue.complete.length > 0 && queue.active.length == 0 && queue.paused.length == 0 && queue.queue.length == 0 && !removedItems) sendNotification({
            headingText: `Queue complete`,
            bodyText: `All ${queue.complete.length} downloads have been completed.`,
            systemAllowed: true,
        })
    };

    updateAppBadge();
    updateProgressBar();
    
    console.log(`Queue refresh (modified: ${queueModified}) \n- ${queue.complete.length} complete\n- ${queue.active.length} active \n- ${queue.queue.length} queued`);
    
    if(queueModified && ws) {
        const sendObj = queue;

        queueEventEmitter.emit(`queueUpdate`, sendObj);

        ws.send({ type: `queue`, data: sendObj });
    }
}

const createDownloadObject = (opt, rawUpdateFunc) => {
    let id = idGen(16);
    const obj = {
        id,
        opt,
        ignoreUpdates: false,
        complete: false,
        failed: false,
        killed: false,
        updateFunc: (update) => {
            if(typeof update == `object` && !update.latest) update = { latest: update, overall: update };

            if(update.overall && update.overall.kill) obj.killFunc = () => update.overall.kill();
            if(update.overall && update.overall.deleteFiles) obj.deleteFiles = () => update.overall.deleteFiles();
            obj.status = Object.assign({}, obj.status, update.latest);
            if(update.latest.percentNum) {
                activeProgress[obj.id] = update.latest.percentNum;
                updateProgressBar();
            }
            sendUpdate(Object.assign({}, obj, { status: update.latest }));
            rawUpdateFunc(update);
        },
        paused: false,
        status: {
            status: `In queue...`
        },
        ytdlpProc: null,
        killFunc: null,
        deleteFiles: null,
        start: () => {
            const index = queue.queue.findIndex(e => e.id == obj.id);

            if(index != -1) {
                const thisObj = queue.queue.splice(index, 1)[0];
                queue.active.push(thisObj);
                console.log(`Moved ${thisObj.id} from queue to active...`)
            }

            refreshQueue();

            const progress = require(`../util/ytdlp`).download(opt, (update, proc) => {
                if(!obj.ytdlpProc && proc) obj.ytdlpProc = proc;
                if(!obj.killFunc && obj.status && obj.status.overall && obj.status.overall.kill) obj.killFunc = () => obj.status.overall.kill();

                if(obj.killed) {
                    if(typeof obj.killed != `number`) obj.killed = 1;
                    obj.killed++;

                    console.log(`Kill attempt #${obj.killed}...}`)

                    //console.log(obj.status)

                    if(obj.killFunc) try {
                        obj.killFunc();
                        console.log(`Killed with internal kill func 1`)
                    } catch(e) { console.log(`Failed internal kill func 1: ${e}`) }

                    if(obj.status && obj.status && obj.status.kill) try {
                        obj.status.kill();
                        console.log(`Killed with internal kill func 2`)
                    } catch(e) { console.log(`Failed internal kill func 2: ${e}`) }

                    if(obj.ytdlpProc && obj.ytdlpProc.kill) try {
                        obj.ytdlpProc.kill();
                        console.log(`Killed with external kill func`)
                    } catch(e) { console.log(`Failed external kill func: ${e}`) }
                }

                //console.log(`createDownload / QUEUE: ${update.percentNum}% | ${update.destinationFile} | ${update.downloadSpeed} | ${update.eta}`);
                obj.updateFunc(update);
            });
    
            progress.then((update) => {
                if(activeProgress[obj.id]) delete activeProgress[obj.id];
                
                obj.complete = true;
                obj.ytdlpProc = null;

                if(obj.killed) obj.status = Object.assign({}, update, {status: `Cancelled`})

                obj.updateFunc(update);

                //res(obj.status);

                refreshQueue();
            });

            progress.catch(e => {
                obj.failed = true;
                obj.ytdlpProc = null;
                obj.updateFunc({status: `Failed: ${e}`});
                //res(obj.status);

                refreshQueue();
            })
        },
        pause: () => {
            console.log(`Pausing ${id}`);

            if(obj.ytdlpProc && !obj.ytdlpProc.killed && !obj.paused) {
                obj.paused = obj.status.status;
                obj.updateFunc({status: `Paused`});
                obj.ytdlpProc.kill(`SIGSTOP`);
            }
        },
        resume: () => {
            console.log(`Resuming ${id}`);

            if(obj.ytdlpProc && !obj.ytdlpProc.killed && obj.paused) {
                obj.updateFunc({status: `Resuming...`});
                obj.paused = false;
                obj.ytdlpProc.kill(`SIGCONT`);
            }
        },
        cancel: () => {
            console.log(`Canceling ${id}`);
            
            obj.killed = true;

            if(obj.status && obj.status.overall && obj.status.overall.kill) {
                try {
                    obj.status.overall.kill();
                    console.log(`Killed killFunc of ${id}`);
                } catch(e) {
                    console.log(`Failed to kill killFunc: ${e}`)
                }
            } else {
                console.log(`No killFunc yet for ${id}...`)
            }

            if(obj.ytdlpProc) {
                try {
                    obj.ytdlpProc.kill();
                    console.log(`Killed ytdlpProc of ${id}`);
                    obj.ytdlpProc = null;
                } catch(e) {
                    console.log(`Failed to kill process: ${e}`)
                }
            } else {
                console.log(`No ytdlpProc yet for ${id}...`)
            }
            
            obj.updateFunc({status: `Canceling...`});
        }
    };

    return obj;
}

const createDownload = (opt, rawUpdateFunc) => new Promise(async res => {
    console.log(`Creating new download session: ${opt.entries ? opt.entries.length : 1} entries...`);

    if(opt.entries) {
        const objs = opt.entries.map(e => createDownloadObject(e, () => {}));
        refreshQueue({ action: `add`, obj: objs })
    } else {
        const obj = createDownloadObject(opt, rawUpdateFunc);
        refreshQueue({ action: `add`, obj });
    }
});

const getFromQueue = (id) => {
    let o = queue.queue.find(e => e.id == id);
    if(!o) o = queue.active.find(e => e.id == id);
    if(!o) o = queue.paused.find(e => e.id == id);
    if(!o) o = queue.complete.find(e => e.id == id);

    return o
}

const queueAction = (id, action) => {
    let o = getFromQueue(id)

    if(o && o[action] && typeof o[action] == `function`) {
        o[action]();
        return true;
    } else return refreshQueue({ action, id });
}

const setWS = (newWs) => {
    if(ws) {
        ws.close();
    }

    ws = newWs;

    ws.send({
        type: `queue`,
        data: queue
    })
    
    ws.sessionID = idGen(10);

    ws.once(`close`, () => {
        if(ws.sessionID == newWs.sessionID) ws = null;
    });
}

const updateStatus = (status) => {
    if(global.window) global.window.webContents.send(`formatStatusUpdate`, status);
}

const setStatusWS = (ws) => {
    if(downloadStatusWs) {
        downloadStatusWs.close();
    };

    downloadStatusWs = ws;
    
    ws.sessionID = idGen(10);

    ws.once(`close`, () => {
        if(ws.sessionID == downloadStatusWs.sessionID) ws = null;
    });

    if(lastDownloadStatus) {
        downloadStatusWs.send(lastDownloadStatus);
    }
}

const refreshAll = () => {
    ws.send({ type: `queue`, data: queue });

    downloadStatusWs.send(lastDownloadStatus);
}

module.exports = {
    queue,
    createDownload,
    refreshAll,
    getFromQueue,
    setWS,
    queueAction,
    updateStatus,
    setStatusWS,
    queueEventEmitter,
};