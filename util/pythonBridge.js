const getBridgePath = require(`../util/filenames/pybridge`).getPath;

const child_process = require(`child_process`);
const fs = require('./promisifiedFS')
const sendNotification = require(`../core/sendNotification`);
const { updateStatus } = require(`./downloadManager`).default;

let basepath = require(`electron`).app.getAppPath();

if(basepath.endsWith(`app.asar`)) basepath = basepath.split(`app.asar`).slice(0, -1).join(`app.asar`)
if(basepath.endsWith(`app.asar/`)) basepath = basepath.split(`app.asar/`).slice(0, -1).join(`app.asar/`)
if(basepath.endsWith(`app.asar\\`)) basepath = basepath.split(`app.asar\\`).slice(0, -1).join(`app.asar\\`)

console.log(`basepath = ${basepath}`)

let resObj = {
    send: (args) => {
        //module.exports.wsConnection.send(JSON.stringify(args));
        try {
            module.exports.bridgeProc.stdin.write((typeof args == `object` ? JSON.stringify(args) : `${args}`) + `\n`);
        } catch(e) {}
    },
    close: () => {
        //module.exports.wsConnection.close();
        //module.exports.wsConnection = null;
    }
};

module.exports = {
    bridgeProc: null,
    idHooks: [],
    active: false,
    bridgeVersions: null,
    starting: false,
    resObj,
    resuscitate: true,
    create: (restarted) => new Promise(async res => {
        global.createdBridge = true;
        module.exports.active = true;

        let bridgepath = getBridgePath();
        
        if(require('fs').existsSync(bridgepath)) {
            module.exports.resuscitate = true;
            
            if(module.exports.bridgeProc) {
                if(module.exports.starting) {
                    console.log(`bridge process is starting, waiting...`);
                    return module.exports.bridgeProc.on(`ready`, () => res(resObj));
                } else {
                    console.log(`bridge process is active, returning`);
                    return res(resObj);
                }
            } else {
                if(!module.exports.bridgeProc) {
                    console.log(`no bridge process!`);

                    let currentStep = 1;
                    let steps = 3;

                    updateStatus(`Starting bridge process (${currentStep}/${steps})...`)

                    let busy = 1;

                    while(busy) await new Promise(async r => {
                        if(module.exports.bridgeProc) {
                            busy = false;
                            return r();
                        } else require('fs').open(bridgepath, 'r', (err, fd) => {
                            if(err && err.code == `EBUSY`) {
                                console.log(`bridge process busy (attempt ${busy}), waiting...`);
                                updateStatus(`Bridge executable is busy (attempt ${busy}), trying again (${currentStep}/${steps})...`)
                                busy++;
                                if(fd) require('fs').close(fd)
                                setTimeout(() => r(), 1000)
                            } else {
                                console.log(`bridge process not busy`)
                                busy = false;
                                if(fd) require('fs').close(fd)
                                r();
                            }
                        });
                    });

                    if(module.exports.bridgeProc && module.exports.starting) {
                        console.log(`bridge process is starting, waiting...`);
                        return module.exports.bridgeProc.on(`ready`, () => res(resObj));
                    } else if(module.exports.bridgeProc && !module.exports.starting) {
                        console.log(`bridge process is active, returning`);
                        return res(resObj);
                    }

                    if(!process.platform.toLowerCase().includes(`win32`)) {
                        console.log(`CHMOD ${bridgepath}`);

                        steps++;
                        currentStep++;
                        updateStatus(`Marking bridge as executable (${currentStep}/${steps})...`)
                        
                        try {
                            require(`child_process`).execFileSync(`chmod`, [`+x`, bridgepath])
                        } catch(e) {
                            await fs.chmodSync(bridgepath, 0o777)
                        }
                    };

                    module.exports.starting = true;

                    currentStep++;
                    updateStatus(`Starting bridge process; this may take a bit (${currentStep}/${steps})...`)

                    module.exports.bridgeProc = child_process.execFile(bridgepath, {
                        env: { ...process.env,
                            PYBRIDGE_HEADER: `true`,
                        },
                        maxBuffer: 1024 * 1024 * 1024, // 1GB
                    });
        
                    let resolved = false;

                    console.log(`starting bridge:\n- bridge path: ${bridgepath}`)

                    module.exports.bridgeProc.on(`close`, (code) => {
                        console.log(`bridge process closed; code: ${code}`);
                        if(module.exports.bridgeProc) module.exports.bridgeProc.stdout.removeAllListeners();

                        try {
                            module.exports.idHooks.filter(h => !h.persist).forEach(h => {
                                try {
                                    h.complete(1)
                                } catch(e) {}
                            });
                        } catch(e) {}

                        module.exports.bridgeProc = null;

                        if(module.exports.resuscitate) {
                            sendNotification({
                                headingText: `The bridge process closed.`,
                                bodyText: `*this wasn't supposed to happen oh no (exit code ${code})*\n\nRestarting now...`,
                                type: `warn`
                            });
                            module.exports.create(true);
                        } else {
                            module.exports.active = false;
                        }
                    });

                    module.exports.bridgeProc.on(`error`, (err) => {
                        console.log(`bridge process errored; err: ${err}`);
                        updateStatus(`Bridge process errored! (${err})`)
                    })

                    const parseLog = async (d, type) => {
                        const prefix = `[BRIDGE] ${type} | `;

                        let str = d.toString().trim();

                        if(str.length > 500) str = str.slice(0, 500) + `...`

                        console.log(prefix + str.trim().split(`\n`).join(`\n` + prefix));

                        if(d.toString().trim().includes(`Bridge ready`) && !resolved) {
                            currentStep++;
                            updateStatus(`Bridge is ready! (${currentStep}/${steps})...`)

                            module.exports.bridgeProc.emit(`ready`);

                            module.exports.starting = false;

                            resolved = true;

                            console.log(`bridge process active`);
            
                            if(restarted == true) sendNotification({
                                headingText: `Bridge process restarted!`,
                                bodyText: `Existing downloads should resume shortly.`,
                            });
            
                            if(module.exports.idHooks.length > 0) {
                                console.log(`idHooks: ${module.exports.idHooks.length}`)
                                module.exports.idHooks.forEach(h => {
                                    if(h.persist) {
                                        resObj.send(JSON.stringify({
                                            id: h.id,
                                            args: h.args,
                                        }));
                                    } else {
                                        h.complete(1)
                                    }
                                })
                            }
            
                            res(resObj);
                        }
                    }

                    module.exports.bridgeProc.stderr.on(`data`, d => parseLog(d, `ERR`));
                    module.exports.bridgeProc.stdout.on(`data`, d => parseLog(d, `OUT`));

                    let existingData = ``;

                    module.exports.bridgeProc.stdout.on(`data`, data => {
                        try {
                            data = decodeURIComponent(escape(data.toString('binary')));
                        } catch(e) {
                            data = data.toString('utf8');
                        }

                        if(!data.includes(`\n\r`)) {
                            existingData += data;
                            console.log(`existingData (appended): ${existingData.length}`)
                            return;
                        } else {
                            if(existingData) {
                                data = existingData + data;
                                console.log(`existingData (reset): ${data.length}`)
                                existingData = ``;
                            } else console.log(`existingData (nothing; no reset): ${data.length}`)

                            const parse = (msg) => {
                                const data = JSON.parse(msg.toString().trim());
                                console.log(`bridge data for id ${data.id} (exists: ${module.exports.idHooks.find(h => h.id == data.id) ? `yes` : `no`}): [${data.type}] ${data.content.length}`);
                                if(data.id) {
                                    module.exports.idHooks.filter(h => h.id == data.id).forEach(h => h.func(data));
                                };
                            }

                            data.trim().split(`\n\r`).forEach((msg, i) => {
                                try {
                                    parse(msg)
                                } catch(e) {
                                    try {
                                        parse(`{` + msg.toString().trim().split(`{`).slice(1).join(`{`).split(`}`).slice(0, -1).join(`}`) + `}`)
                                    } catch(e) {
                                        existingData += msg.toString();
                                    }
                                }
                            })
                        }
                    });
                }
            }
        } else res(null);
    }),
};