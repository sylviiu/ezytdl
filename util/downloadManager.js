sessions = {
    get: (id, { staggered, noSendErrors }={}) => {
        if(!id) id = `default`;
    
        if(!sessions[id]) {
            console.log(`----------------------------------\nCREATING NEW DOWNLOADMANAGER: ${id}\n----------------------------------`)

            const idGen = require(`./idGen`);
            
            const { app } = require(`electron`);

            let lastQueueSend = 0;
            let queueSendTimeout = 0;
            
            const queue = {
                complete: [],
                active: [],
                paused: [],
                queue: []
            };
            
            const queueEventEmitter = new (require(`events`))();

            const filterUpdate = (o) => {
                if(!o || typeof o != `object`) return o;

                const useObj = Object.assign({}, o);

                if(useObj.id && useObj.status && useObj.opt) {
                    return Object.assign({}, {
                        id: useObj.id,
                        opt: useObj.opt,
                        status: useObj.status,
                        complete: useObj.complete,
                        failed: useObj.failed,
                        killed: useObj.killed,
                    })
                } else return useObj;
            }
            
            let activeProgress = {};

            const blacklistedKeys = [`ytdlpProc`, `killFunc`, `deleteFiles`, `nextUpdateTimeout`, `updateFunc`, `ignoreUpdates`, `lastUpdateSent`];

            const filteredObj = (newObj, depth=0) => {
                if(depth > 6) return null;

                if(newObj && typeof newObj == `object`) {
                    for(const key of Object.keys(newObj)) {
                        if(!newObj[key]) {
                            //console.log(`[filteredObj] Deleting null / falsy key ${key} from object...`)
                            delete newObj[key];
                        } else if(blacklistedKeys.includes(key)) {
                            //console.log(`[filteredObj] Deleting blacklisted key ${key} from object...`)
                            delete newObj[key];
                        } else if(newObj[key] && typeof newObj[key] == `function`) {
                            //console.log(`[filteredObj] Deleting function ${key} from object...`)
                            delete newObj[key];
                        } else if(newObj[key] && typeof newObj[key] == `object`) {
                            if(typeof newObj[key].length == `number`) {
                                //console.log(`[filteredObj] Filtering array ${key}...`)
                                newObj[key] = newObj[key].map(e => typeof e == `object` ? filteredObj(e, depth+1) : e);
                            } else {
                                //console.log(`[filteredObj] Filtering object ${key}...`)
                                newObj[key] = filteredObj(newObj[key], depth+1);
                            }
                        }
                    };
                }

                return newObj;
            };
            
            let ws = { send: (sendData) => id == `default` && global.window ? global.window.webContents.send(`queueUpdate`, sendData) : null };
            
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
                        bodyText: `There are ${totalItems} items in the queue.\n\nDepending on your computer, having too many items in the download queue may cause the UI to slow down and/or freeze, especially if you navigate to different pages while the queue is active.\n\nIf the app does freeze, it is still working. You can check the progress of the queue in the taskbar icon.`,
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
            
            const sendUpdate = (sendObj) => (sendObj && typeof sendObj == `object` && ws) ? ws.send({
                type: `update`,
                data: filteredObj(filterUpdate(sendObj))
            }) : null;

            let addTimeout = 0;
            
            const refreshQueue = (opt) => {    
                let queueModified = false;
            
                let removedItems = false;
            
                if(opt) {
                    const { action } = opt;

                    const actions = {
                        add: ({obj}) => {
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
                        },
                        remove: ({id}) => {
                            const removeEntry = (id) => {
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

                            if(typeof id == `object`) {    
                                for (i of id) removeEntry(i)
                            } else {
                                removeEntry(id)
                            }
                        },
                        requeue: ({id}) => {
                            for (state of Object.keys(queue)) {
                                let o = queue[state].findIndex(e => e.id == id);

                                console.log(`requeueing ${id} from ${state}... (${o})`, queue[state])
                    
                                if(o != -1) {
                                    queue[state].splice(o, 1)[0].queueAgain();
                                    queueModified = true;
                                    removedItems = true;
                                }
                            };
                        }
                    }

                    if(actions[action]) actions[action](opt);
                }
            
                console.log(`Updating queue...`)
            
                for(const o of queue.active) {
                    //console.log(`active`, o)
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
                    //const conf = require(`../getConfig`)();
                    const conf = global.lastConfig;

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
                            const delay = Math.max(0, addTimeout - Date.now());
                            addTimeout = Date.now() + delay + 150;
                            console.log(`delay:`, delay, `addTimeout:`, addTimeout)
                            setTimeout(() => next.start(), delay);
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

                    refreshAll();
                }
            }
            
            const createDownloadObject = (rawOpt, rawUpdateFunc, downloadFunc) => {
                const opt = (rawOpt && typeof rawOpt == `object`) ? (Object.assign((typeof rawOpt.length == `number` ? [] : {}), rawOpt)) : rawOpt;

                let id = idGen(16);

                const obj = {
                    id,
                    opt: opt.info ? Object.assign({}, {
                        info: opt && typeof opt.info == `object` ? {
                            webpage_url_domain: opt.info.webpage_url_domain,
                            title: opt.info.title,
                            thumbnails: opt.info.thumbnails && typeof opt.info.thumbnails.length == `number` && opt.info.thumbnails.filter(o => o && o.width).length > 0 ? opt.info.thumbnails.filter(o => o && o.width).sort((a,b) => b.width - a.width).slice(0, 3) : opt.info.thumbnails,
                            thumbnail: opt.info.thumbnail,
                            output_name: opt.info.output_name,
                            _ezytdl_ui_icon: opt.info._ezytdl_ui_icon,
                            _ezytdl_ui_type: opt.info._ezytdl_ui_type,
                            _ezytdl_ui_title: opt.info._ezytdl_ui_title,
                        } : opt.info
                    }) : opt,
                    lastUpdateSent: 0,
                    nextUpdateTimeout: null,
                    pendingLatestUpdate: null,
                    nextUpdateFunc: () => {},
                    ignoreUpdates: false,
                    complete: false,
                    failed: false,
                    killed: false,
                    updateFunc: (update) => {
                        if(typeof update == `object` && !update.latest) {
                            update = { latest: Object.assign((obj.pendingLatestUpdate ? obj.pendingLatestUpdate : {}), update), overall: update };
                        } else if(typeof update == `object` && update.latest) {
                            update = Object.assign({}, update, {
                                latest: Object.assign((obj.pendingLatestUpdate ? obj.pendingLatestUpdate : {}), update.latest)
                            });
                        }

                        if(obj.nextUpdateTimeout) clearTimeout(obj.nextUpdateTimeout);
            
                        if(update.overall && update.overall.kill) obj.killFunc = () => update.overall.kill();
                        if(update.overall && update.overall.deleteFiles) obj.deleteFiles = () => update.overall.deleteFiles();

                        Object.assign(obj.status, update.latest);

                        if(update.latest.percentNum) {
                            activeProgress[obj.id] = update.latest.percentNum;
                            updateProgressBar();
                        };

                        obj.pendingLatestUpdate = update.latest;

                        const timeout = Math.max(0, 150 - (Date.now() - obj.lastUpdateSent));
                        if(timeout == 0) obj.lastUpdateSent = Date.now();

                        obj.nextUpdateFunc = () => {
                            obj.nextUpdateFunc = () => {};

                            obj.nextUpdateTimeout = null;

                            const sendObj = Object.assign({}, obj, {
                                status: Object.assign({}, obj.status, obj.pendingLatestUpdate)
                            });

                            //console.log(`sending update with status:`, sendObj.status)

                            sendUpdate(obj);

                            obj.pendingLatestUpdate = null;
                        }

                        obj.nextUpdateTimeout = setTimeout(() => obj.nextUpdateFunc())

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
                
                        progress.then(update => {
                            if(activeProgress[obj.id]) delete activeProgress[obj.id];

                            if(obj.nextUpdateTimeout) {
                                clearTimeout(obj.nextUpdateTimeout);
                                obj.nextUpdateTimeout = null;
                                obj.nextUpdateFunc();
                            };
                            
                            obj.complete = true;
                            obj.ytdlpProc = null;
            
                            if(downloadFunc) {
                                obj.lastUpdateSent = 0;

                                const finishedObj = { status: `Finished "${downloadFunc}"`, progressNum: 100 }

                                obj.updateFunc(update && update.latest ? Object.assign(update, {
                                    latest: Object.assign(update.latest, finishedObj)
                                }) : Object.assign(update || {}, finishedObj));

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
                    const objs = opt.entries.map(e => Object.assign(createDownloadObject(e, rawUpdateFunc, downloadFunc), {
                        queueAgain: () => {
                            createDownload(e, rawUpdateFunc, downloadFunc);
                        }
                    }));

                    refreshQueue({ action: `add`, obj: objs })
                } else {
                    const obj = Object.assign(createDownloadObject(opt, rawUpdateFunc, downloadFunc), {
                        queueAgain: () => {
                            createDownload(opt, rawUpdateFunc, downloadFunc);
                        }
                    });
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

                refreshAll();
                
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
            };
            
            const refreshAll = () => {
                const timeout = Math.max(0, 450 - (Date.now() - lastQueueSend));

                if(timeout == 0) lastQueueSend = Date.now();
                if(queueSendTimeout) clearTimeout(queueSendTimeout);

                queueSendTimeout = setTimeout(() => {
                    queueSendTimeout = null;

                    const c1 = Object.assign({}, queue);

                    for(const queueType of Object.keys(c1)) {
                        //console.log(`Filtering ${queueType} in queue...`)
                        c1[queueType] = c1[queueType].map(e => filteredObj(filterUpdate(e)));
                    }

                    ws.send({ type: `queue`, data: c1 });
                    downloadStatusWs.send(lastDownloadStatus);
                }, timeout);
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