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

const logHeading = (bridgepath, bridgecwd) => {
    console.log(`-------------------------------\nBRIDGE DETAILS\nbasepath: ${basepath}\nbridgeProc: ${module.exports.bridgeProc}\nbridgepath: ${bridgepath}\nbridgecwd: ${bridgecwd}\n-------------------------------`)
}

module.exports = {
    bridgeProc: null,
    idHooks: [],
    active: false,
    bridgeVersions: null,
    resObj,
    create: (restarted) => new Promise(async res => {
        global.createdBridge = true;
        module.exports.active = true;

        let filename = process.platform == `win32` ? `pybridge.exe` : `pybridge`;
        let bridgepath = getPath(`./pybridge/${filename}`, true, true) || getPath(`./resources/pybridge/${filename}`, true, true) || `-- unknown --`;
        
        if(bridgepath.startsWith(`.`)) bridgepath = path.join(__dirname.split(`util`).slice(0, -1).join(`util`), bridgepath);
        
        let bridgecwd = bridgepath.split(filename).slice(0, -1).join(filename)

        logHeading(bridgepath, bridgecwd);
        
        if(require('fs').existsSync(bridgepath)) {
            if(module.exports.bridgeProc) {
                res(resObj);
            } else {
                if(!module.exports.bridgeProc) {
                    console.log(`no bridge process!`)

                    if(!process.platform.toLowerCase().includes(`win32`)) {
                        console.log(`CHMOD ${bridgepath}`);
                        
                        try {
                            require(`child_process`).execFileSync(`chmod`, [`+x`, bridgepath])
                        } catch(e) {
                            fs.chmodSync(bridgepath, 0o777)
                        }
                    }
        
                    module.exports.bridgeProc = await new Promise(r => {
                        let resolved = false;

                        console.log(`starting bridge:\n- bridge path: ${bridgepath}`)

                        process.env.PYTHONUNBUFFERED = `1`;
                
                        const proc = child_process.execFile(bridgepath, {
                            cwd: bridgecwd,
                            maxBuffer: 1024 * 1024 * 1024, // 1GB
                        });

                        proc.on(`close`, (code) => {
                            console.log(`bridge process closed; code: ${code}`);
                            proc.stdout.removeAllListeners();
                            sendNotification({
                                headingText: `The bridge process closed.`,
                                bodyText: `*this wasn't supposed to happen oh no (exit code ${code})*\n\nRestarting now...`,
                                type: `warn`
                            });
                            try {
                                module.exports.idHooks.filter(h => !h.persist).forEach(h => {
                                    try {
                                        h.complete(1)
                                    } catch(e) {}
                                });
                            } catch(e) {}
                            module.exports.bridgeProc = null;
                            module.exports.create(true);
                        });

                        proc.on(`error`, (err) => {
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

                            console.log(prefix + str.trim().split(`\n`).join(`\n` + prefix));

                            if(d.toString().trim().includes(`Bridge ready`) && !resolved) {
                                resolved = true;
                                r(proc)
                            }
                        }

                        proc.stderr.on(`data`, d => parseLog(d, `ERR`));

                        let existingData = ``;

                        proc.stdout.on(`data`, data => {
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
                                            //console.error(`-----------------------\nmsg: "${msg}"\nerr: ${e}\n-----------------------`)
                                            console.log(`failed to parse msg -- adding to existingData`);
                                            existingData += msg.toString();
                                        }
                                    }
                                })
                            }
                        });
                    });
                }
            
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

                res(resObj)
        
                /*module.exports.wsConnection.onmessage = (msg) => {
                    try {
                        const data = JSON.parse(msg.data);
                        if(data.id) module.exports.idHooks.filter(h => h.id == data.id).forEach(h => h.func(data));
                    } catch(e) {
                        console.error(e);
                    }
                }*/
            }
        }// else res(null);
    }),
};