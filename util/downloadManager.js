sessions = {
    get: (id, opt={}) => {
        const { staggered, noSendErrors } = opt;

        if(!id) id = `default`;
    
        if(!sessions[id]) {
            console.log(`----------------------------------\nCREATING NEW DOWNLOADMANAGER: ${id}\n----------------------------------`)

            const idGen = require(`./idGen`);
            
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
                send: (c1) => {
                    if(id != `default`) return;
                    
                    if(!global.window) return;
            
                    let content = Object.assign({}, c1);
            
                    if(typeof content == `object` && typeof content.data == `object` && content.data.ytdlpProc) {
                        content.data = Object.assign({}, content.data, { ytdlpProc: null })
                    }
            
                    if(typeof content == `object`) content = JSON.stringify(content);
                    
                    global.window.webContents.send(`queueUpdate`, JSON.parse(content));
                }
            };
            
            let downloadStatusWs = {
                send: (content) => {
                    if(id != `default`) return;

                    if(!global.window) return;
            
                    if(typeof content == `object`) content = JSON.stringify(content);
            
                    global.window.webContents.send(`formatStatusUpdate`, JSON.parse(content));
                },
            };
            let lastDownloadStatus = null;
            
            const sendNotification = require(`../core/sendNotification`)
            
            let queueSizeWarningSent = false;
            
            const updateAppBadge = () => {
                if(id != `default`) return //console.log(`Not updating app badge for ${id} because it's not the default session.`);

                const totalItems = Object.values(queue).slice(1).reduce((a,b) => a+b.length, 0);
                
                if(totalItems == 0 && queue.complete.length > 0) {
                    app.setBadgeCount();
                } else app.setBadgeCount(totalItems);
            
                if(!queueSizeWarningSent && totalItems > 50) {
                    queueSizeWarningSent = true;
            
                    if(id == `default`) sendNotification({
                        headingText: `Warning!`,
                        bodyText: `There are ${totalItems} items in the queue.\n\nDepending on your computer, having too many items in the download queue may cause the UI to slow down and/or freeze, especially if you navigate to different pages while the queue is active. To ensure stability, stay on this screen while you finish this queue.`,
                        type: `warn`,
                    });
                }
            }
            
            let lastProgress = null;
            
            const updateProgressBar = () => {
                if(id != `default`) return //console.log(`Not updating progress bar for ${id} because it's not the default session.`);

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
            
                if(value != lastProgress) {
                    lastProgress = value;
                    if(global.window) {
                        global.window.setProgressBar(value);
                        global.window.webContents.send(`queueProgress`, value*100);
                    }
                }
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

                    let maxDownloads = conf.concurrentDownloads;

                    if(sessions[id].concurrentDownloads) {
                        maxDownloads = sessions[id].concurrentDownloads;
                    } else if(sessions[id].concurrentDownloadsMult) {
                        maxDownloads = conf.concurrentDownloads * sessions[id].concurrentDownloadsMult;
                    }

                    let i = 0;
            
                    while((queue.active.length + queue.paused.length) < maxDownloads && queue.queue.length > 0) {
                        const next = queue.queue.shift();
                        queue.active.push(next);
                        if(staggered) {
                            setTimeout(() => next.start(), i*250)
                        } else next.start();
                        i++;
                    }
            
                    if(id == `default` && queue.complete.length > 0 && queue.active.length == 0 && queue.paused.length == 0 && queue.queue.length == 0 && !removedItems) sendNotification({
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
            
            const createDownloadObject = (opt, rawUpdateFunc, downloadFunc) => {
                let id = idGen(16);
                const obj = {
                    id,
                    opt: Object.assign({}, opt, { 
                        info: typeof opt.info == `object` ? {
                            webpage_url_domain: opt.info.webpage_url_domain,
                            title: opt.info.title,
                            thumbnails: opt.info.thumbnails,
                            thumbnail: opt.info.thumbnail,
                        } : opt.info
                    }),
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
                        if(!downloadFunc) rawUpdateFunc(update);
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

                        let args = [...(typeof opt == `object` && typeof opt.length == `number` ? opt : [opt])]

                        if(!downloadFunc) {
                            args.push((update, proc) => {
                                if(!obj.ytdlpProc && proc) obj.ytdlpProc = proc;
                                if(!obj.killFunc && obj.status && obj.status.overall && obj.status.overall.kill) obj.killFunc = () => obj.status.overall.kill();
                                obj.updateFunc(update);
                            });
                        } else {
                            obj.updateFunc({status: `Running "${downloadFunc}"`, progressNum: -1})
                        }
            
                        const progress = require(`../util/ytdlp`)[downloadFunc || `download`](...args);
                
                        progress.then((update) => {
                            if(activeProgress[obj.id]) delete activeProgress[obj.id];
                            
                            obj.complete = true;
                            obj.ytdlpProc = null;
            
                            if(downloadFunc) {
                                obj.updateFunc(Object.assign({}, obj.status, {status: `Finished "${downloadFunc}"`, progressNum: 100}));
                                rawUpdateFunc(update);
                            }
            
                            if(obj.killed) obj.status.status = `Canceled`;

                            obj.result = update;
            
                            refreshQueue();
                        });
            
                        progress.catch(e => {
                            obj.failed = true;
                            obj.ytdlpProc = null;
                            obj.updateFunc({status: `Failed: ${e}`});

                            rawUpdateFunc(null);
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
                                console.log(`Killed killFunc [1] of ${id}`);
                            } catch(e) {
                                console.log(`Failed to kill [1] killFunc: ${e}`)
                            }
                        } else if(obj.killFunc) {
                            obj.killFunc();
                            console.log(`Killed killFunc [2] of ${id}`);
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
            
            const createDownload = (opt, rawUpdateFunc, downloadFunc) => new Promise(async res => {
                console.log(`Creating new download session: ${opt.entries ? opt.entries.length : 1} entries...`);

                if(typeof rawUpdateFunc != `function`) rawUpdateFunc = () => {};
            
                if(opt.entries && typeof opt.entries.map == `function`) {
                    const objs = opt.entries.map(e => createDownloadObject(e, rawUpdateFunc, downloadFunc));
                    refreshQueue({ action: `add`, obj: objs })
                } else {
                    const obj = createDownloadObject(opt, rawUpdateFunc, downloadFunc);
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
            
            const updateStatusPercent = (status) => {
                if(global.window) global.window.webContents.send(`formatStatusPercent`, status);
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
        
            if(!sessions[id]) sessions[id] = {
                config: {
                    concurrentDownloadsMult: 1,
                },
                set: (conf) => Object.assign(sessions[id].config, conf),
                queue,
                createDownload,
                refreshAll,
                getFromQueue,
                setWS,
                queueAction,
                updateStatus,
                updateStatusPercent,
                setStatusWS,
                queueEventEmitter,
            };
        }
    
        return sessions[id];
    }
}

sessions.default = sessions.get();

module.exports = sessions;