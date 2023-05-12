const idGen = require(`./idGen`);

const queue = {
    complete: [],
    active: [],
    paused: [],
    queue: []
};

let ws = null;

let downloadStatusWs = null;
let lastDownloadStatus = null;

let notificationWs = null;
let notificationQueue = [];

const queueStrings = [ `Up next!` ];

let queueSizeWarningSent = false;

const sendUpdate = (sendObj) => {
    //console.log(`Sending download update...`)
    if(ws) ws.send(JSON.stringify({
        type: `update`,
        data: sendObj
    }))
}

const refreshQueue = (opt) => {    
    let queueModified = false;

    if(opt) {
        const { action, id, obj } = opt;

        if(action == `add` && obj) {
            if(obj.length && obj.length > 0) {
                console.log(`Adding ${obj.length} objects to queue...`)
                queue.queue.push(...obj);
                console.log(queue.queue[0])
                queueModified = true;
            } else {
                console.log(`Adding ${obj.id} to queue...`)
                queue.queue.push(obj);
                queueModified = true;
            }
        } else if(action == `remove` && id) {
            console.log(`Removing ${id} from queue...`)
    
            for (state of Object.keys(queue)) {
                let o = queue[state].findIndex(e => e.id == id);
    
                if(o != -1) {
                    if(queue[state][0].ytdlpProc && !queue[state][0].ytdlpProc.killed && queue[state][0].ytdlpProc.kill) queue[state][0].ytdlpProc.kill(9)
                    queue[state].splice(o, 1)
                    console.log(`Removed ${id} from state ${state}...`)
                    queueModified = true;
                }
            }
        }
    }

    const totalItems = Object.values(queue).slice(1).reduce((a,b) => a+b.length, 0);

    console.log(`total queue length : ${totalItems}`)

    if(!queueSizeWarningSent && totalItems > 50) {
        queueSizeWarningSent = true;

        sendNotification({
            headingText: `Warning!`,
            bodyText: `There are ${totalItems} items in the queue.\n\nDepending on your computer, having too many items in the download queue may cause the UI to slow down and/or freeze, especially if you navigate to different pages while the queue is active. To ensure stability, stay on this screen while you finish this queue.`,
            type: `warn`,
        });
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
            console.log(next)
            next.start();
        };
    };

    for (i in queue.queue) {
        queue.queue[i].updateFunc({status: `${queueStrings[i] || `In queue... [${i}/${queue.queue.length}]`}`})
    };
    
    console.log(`Queue refresh (modified: ${queueModified}) \n- ${queue.complete.length} complete\n- ${queue.active.length} active \n- ${queue.queue.length} queued`);
    
    if(queueModified && ws) ws.send(JSON.stringify({
        type: `queue`,
        data: queue
    }));
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
            if(!obj.ignoreUpdates) {
                if(update.overall && update.overall.kill) obj.killFunc = () => update.overall.kill();
                obj.status = update.overall;
                sendUpdate(Object.assign({}, obj, { status: update.latest }));
                rawUpdateFunc(update);
            }
        },
        paused: false,
        status: {},
        ytdlpProc: null,
        killFunc: null,
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

                    console.log(obj.status)

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
            obj.ignoreUpdates = true;
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

const queueAction = (id, action) => {
    let o = queue.queue.find(e => e.id == id);
    if(!o) o = queue.active.find(e => e.id == id);
    if(!o) o = queue.paused.find(e => e.id == id);
    if(!o) o = queue.complete.find(e => e.id == id);

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

    ws.send(JSON.stringify({
        type: `queue`,
        data: queue
    }))
    
    ws.sessionID = idGen(10);

    ws.once(`close`, () => {
        if(ws.sessionID == newWs.sessionID) ws = null;
    });
}

const updateStatus = (status) => {
    if(downloadStatusWs) {
        downloadStatusWs.send(status.toString().trim());
    }
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

const sendNotif = (msg) => {
    if(msg.redirect) {
        if(!require(`fs`).existsSync(`./html/${msg.redirect}`)) {
            msg.redirect = null;
            msg.bodyText += `\n\n-- redirect file redacted; file not found`
        }
    };

    notificationWs.send(msg);
}

const setNotificationWS = (ws) => {
    if(notificationWs) {
        notificationWs.close();
    };

    notificationWs = ws;
    
    ws.sessionID = idGen(10);

    ws.once(`close`, () => {
        if(ws.sessionID == notificationWs.sessionID) ws = null;
    });

    if(notificationQueue) {
        for (notif of notificationQueue) sendNotif(notif);
        notificationQueue = [];
    }
}

const sendNotification = (msg) => {
    if(typeof msg == `object`) msg = JSON.stringify(msg)

    if(!notificationWs) {
        notificationQueue.push(msg);
        return false;
    } else {
        sendNotif(msg);
        return true;
    }
}

module.exports = {
    queue,
    createDownload,
    setWS,
    queueAction,
    updateStatus,
    setStatusWS,
    setNotificationWS,
    sendNotification
};