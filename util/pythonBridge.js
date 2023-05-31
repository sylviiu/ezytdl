const child_process = require(`child_process`);
const path = require(`path`);
const wsprocess = require(`./class/wsprocess`);
const idGen = require(`./idGen`);
const basepath = process.resourcesPath;

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

const logHeading = (usePath) => {
    console.log(`-------------------------------\nBRIDGE DETAILS\nbridgeProc: ${module.exports.bridgeProc}\nwsConnection: ${module.exports.wsConnection}\nbridgepath: ${module.exports.bridgepath}${usePath ? `\noverriden path: ${usePath}` : ``}\n-------------------------------`)
}

let relativebridgepath = path.join(`pybridge`, process.platform == `win32` ? `bridge.exe` : `bridge`);
let bridgepath = path.join(basepath, relativebridgepath);
if(!require('fs').existsSync(bridgepath)) bridgepath = `./${relativebridgepath}`

module.exports = {
    wsConnection: null,
    bridgeProc: null,
    idHooks: [],
    active: false,
    bridgepath,
    create: () => new Promise(async res => {
        global.createdBridge = true;
        module.exports.active = true;

        logHeading();
        
        if(require('fs').existsSync(module.exports.bridgepath)) {
            if(module.exports.wsConnection && module.exports.bridgeProc) {
                res(resObj());
            } else {
                if(!module.exports.bridgeProc) {
                    console.log(`no bridge process!`)

                    if(module.exports.wsConnection) {
                        module.exports.wsConnection.close();
                        module.exports.wsConnection = null;
                    };
        
                    module.exports.bridgeProc = await new Promise(r => {
                        let resolved = false;

                        console.log(`starting bridge:\n- bridge path: ${module.exports.bridgepath}`)
                
                        const proc = child_process.execFile(module.exports.bridgepath);

                        proc.on(`close`, (code) => {
                            console.log(`bridge process closed; code: ${code}`);
                        });

                        proc.on(`error`, (err) => {
                            console.log(`bridge process errored; err: ${err}`);
                        })

                        const parseLog = (d, type) => {
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
        } else res(null);
    }),
};

logHeading();