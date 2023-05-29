const child_process = require(`child_process`);
const path = require(`path`);
const wsprocess = require(`./class/wsprocess`);
const idGen = require(`./idGen`);
const basepath = require('electron').app.getAppPath();

const WebSocket = require(`ws`);

let bridgeProc = null;

let resObj = () => ({
    send: (args) => {
        module.exports.wsConnection.send(JSON.stringify(args));
    },
    close: () => {
        module.exports.wsConnection.close();
        module.exports.wsConnection = null;
    }
});

module.exports = {
    wsConnection: null,
    idHooks: [],
    active: false,
    create: () => new Promise(async res => {
        global.createdBridge = true;
        module.exports.active = true;
        
        if(global.useBridge) {
            if(module.exports.wsConnection) {
                res(resObj());
            } else {
                const { bindir, pyenvPath } = require(`./filenames/python`);

                const pythonBin = process.platform == `win32` ? path.join(bindir, `python.exe`) : path.join(bindir, `python`);
            
                //process.env.PYTHON_BIN = pythonBin
                //process.env.PATH = process.platform == `win32` ? `${bindir};${process.env.PATH}` : `${bindir}:${process.env.PATH}`
                //process.env.VIRTUAL_ENV = pyenvPath;
                process.env.PYTHONUNBUFFERED = `1`

                //console.log(`\nnew instance path: ${process.env.PATH}\n\nbindir: ${bindir}\n\nPYTHON_BIN: ${process.env.PYTHON_BIN}\n\nVIRTUAL_ENV: ${process.env.VIRTUAL_ENV}\n\nAPP BASEPATH: ${basepath}\n`);
                
                if(!bridgeProc) {
                    console.log(`no bridge process!`)

                    if(module.exports.wsConnection) {
                        module.exports.wsConnection.close();
                        module.exports.wsConnection = null;
                    };
        
                    bridgeProc = await new Promise(r => {
                        let resolved = false;

                        const bridgePath = path.join(basepath, `ytdlp`, `bridge.py`);

                        console.log(`starting bridge:\n- python bin: ${pythonBin}\n- bridge path: ${bridgePath}`)
                
                        const proc = child_process.execFile(pythonBin, [bridgePath]);

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