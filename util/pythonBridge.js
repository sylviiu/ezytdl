const getBridgePath = require(`../util/filenames/pybridge`).getPath;

const child_process = require(`child_process`);
const path = require(`path`);
const wsprocess = require(`./class/wsprocess`);
const getPath = require(`./getPath`);
const sendNotification = require(`../core/sendNotification`);

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
    resObj,
    resuscitate: true,
    create: (restarted) => new Promise(async res => {
        global.createdBridge = true;
        module.exports.active = true;

        let bridgepath = getBridgePath();
        
        if(require('fs').existsSync(bridgepath)) {
            module.exports.resuscitate = true;
            
            if(module.exports.bridgeProc) {
                res(resObj);
            } else {
                if(!module.exports.bridgeProc) {
                    console.log(`no bridge process!`);

                    let busy = 1;

                    while(busy) await new Promise(async r => {
                        require('fs').open(bridgepath, 'r', (err, fd) => {
                            if(err && err.code == `EBUSY`) {
                                console.log(`bridge process busy (attempt ${busy}), waiting...`);
                                busy++;
                                setTimeout(() => r(), 1000)
                            } else {
                                console.log(`bridge process not busy`)
                                busy = false;
                                r();
                            }
                        });
                    });

                    require(`./currentVersion/pybridge`)(true);

                    if(!process.platform.toLowerCase().includes(`win32`)) {
                        console.log(`CHMOD ${bridgepath}`);
                        
                        try {
                            require(`child_process`).execFileSync(`chmod`, [`+x`, bridgepath])
                        } catch(e) {
                            fs.chmodSync(bridgepath, 0o777)
                        }
                    };

                    module.exports.bridgeProc = child_process.execFile(bridgepath, {
                        maxBuffer: 1024 * 1024 * 1024, // 1GB
                    });
        
                    let resolved = false;

                    console.log(`starting bridge:\n- bridge path: ${bridgepath}`)

                    process.env.PYTHONUNBUFFERED = `1`;

                    module.exports.bridgeProc.on(`close`, (code) => {
                        console.log(`bridge process closed; code: ${code}`);
                        module.exports.bridgeProc.stdout.removeAllListeners();

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
                    })

                    const parseLog = async (d, type) => {
                        if(!module.exports.bridgeVersions) d.split(`\n\r`).forEach(msg => {
                            try {
                                module.exports.bridgeVersions = JSON.parse(msg.toString().trim());
                            } catch(e) { }
                        })

                        const prefix = `[BRIDGE] ${type} | `;

                        let str = d.toString().trim();

                        if(str.length > 500) str = str.slice(0, 500) + `...`

                        //console.log(prefix + str.trim().split(`\n`).join(`\n` + prefix));

                        if(d.toString().trim().includes(`Bridge ready`) && !resolved) {
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

                    let existingData = ``;

                    module.exports.bridgeProc.stdout.on(`data`, data => {
                        if(!data.toString().includes(`\n\r`)) {
                            existingData += data.toString();
                            return;
                        } else {
                            if(existingData) {
                                data = existingData + data.toString();
                                existingData = ``;
                            }

                            const parse = (msg) => {
                                const data = JSON.parse(msg.toString().trim());
                                if(data.id) {
                                    module.exports.idHooks.filter(h => h.id == data.id).forEach(h => h.func(data));
                                } else if(!module.exports.bridgeVersions) {
                                    module.exports.bridgeVersions = data;
                                }
                            }

                            data.toString().trim().split(`\n\r`).forEach((msg, i) => {
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