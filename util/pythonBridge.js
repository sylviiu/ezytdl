const child_process = require(`child_process`);
const path = require(`path`);
const wsprocess = require(`./class/wsprocess`);
const getPath = require(`./getPath`);
const idGen = require(`./idGen`);

let basepath = require(`electron`).app.getAppPath();

if(basepath.endsWith(`app.asar`)) basepath = basepath.split(`app.asar`).slice(0, -1).join(`app.asar`)
if(basepath.endsWith(`app.asar/`)) basepath = basepath.split(`app.asar/`).slice(0, -1).join(`app.asar/`)
if(basepath.endsWith(`app.asar\\`)) basepath = basepath.split(`app.asar\\`).slice(0, -1).join(`app.asar\\`)

console.log(`basepath = ${basepath}`)

const WebSocket = require(`ws`);

let resObj = () => ({
    send: (args) => {
        module.exports.wsConnection.send(JSON.stringify(args));
    },
    close: () => {
        module.exports.wsConnection.close();
        module.exports.wsConnection = null;
    }
});

const logHeading = (bridgepath, bridgecwd) => {
    console.log(`-------------------------------\nBRIDGE DETAILS\nbasepath: ${basepath}\nbridgeProc: ${module.exports.bridgeProc}\nwsConnection: ${module.exports.wsConnection}\nbridgepath: ${bridgepath}\nbridgecwd: ${bridgecwd}\n-------------------------------`)
}

module.exports = {
    wsConnection: null,
    bridgeProc: null,
    idHooks: [],
    active: false,
    bridgeVersions: null,
    create: () => new Promise(async res => {
        global.createdBridge = true;
        module.exports.active = true;

        let filename = process.platform == `win32` ? `pybridge.exe` : `pybridge`;
        let bridgepath = getPath(`./pybridge/${filename}`, true, true) || getPath(`./resources/pybridge/${filename}`, true, true) || `-- unknown --`;
        
        if(bridgepath.startsWith(`.`)) bridgepath = path.join(__dirname.split(`util`).slice(0, -1).join(`util`), bridgepath);
        
        let bridgecwd = bridgepath.split(filename).slice(0, -1).join(filename)

        logHeading(bridgepath, bridgecwd);
        
        if(require('fs').existsSync(bridgepath)) {
            if(module.exports.wsConnection && module.exports.bridgeProc) {
                res(resObj());
            } else {
                if(!module.exports.bridgeProc) {
                    console.log(`no bridge process!`)

                    if(module.exports.wsConnection) {
                        module.exports.wsConnection.close();
                        module.exports.wsConnection = null;
                    };

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
                
                        const proc = child_process.execFile(bridgepath, {cwd: bridgecwd});

                        proc.on(`close`, (code) => {
                            console.log(`bridge process closed; code: ${code}`);
                        });

                        proc.on(`error`, (err) => {
                            console.log(`bridge process errored; err: ${err}`);
                        })

                        const parseLog = (d, type) => {
                            if(!module.exports.bridgeVersions) try {
                                module.exports.bridgeVersions = JSON.parse(d.toString().trim());
                            } catch(e) { }

                            const prefix = `[BRIDGE] ${type} | `;
                            console.log(prefix + d.toString().trim().split(`\n`).join(`\n` + prefix));

                            if(d.toString().trim().includes(`Bridge ready`) && !resolved) {
                                resolved = true;
                                r(proc)
                            }
                        }

                        proc.stdout.on(`data`, d => parseLog(d, `OUT`));
                        proc.stderr.on(`data`, d => parseLog(d, `ERR`));
                    });
                }
            
                console.log(`bridge process active`);
        
                module.exports.wsConnection = new WebSocket(`ws://127.0.0.1:8765`);

                const thisConnectionID = idGen(24);
                
                module.exports.wsConnection.id = thisConnectionID;

                module.exports.wsConnection.onclose = () => {
                    if(module.exports.wsConnection.id == thisConnectionID) {
                        console.log(`ws connection closed`);
                        module.exports.wsConnection = null;
                        module.exports.create();
                    }
                }
        
                module.exports.wsConnection.onopen = () => {
                    console.log(`ws connection open`);
                    res(resObj());
                }
        
                module.exports.wsConnection.onmessage = (msg) => {
                    try {
                        const data = JSON.parse(msg.data);
                        if(data.id) module.exports.idHooks.filter(h => h.id == data.id).forEach(h => h.func(data));
                    } catch(e) {
                        console.error(e);
                    }
                }
            }
        }// else res(null);
    }),
};