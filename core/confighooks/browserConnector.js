const ws = require('ws');
const idGen = require(`../../util/idGen`);
const authentication = require(`../authentication`);

const package = require(`../../package.json`);

const getPath = require(`../../util/getPath`);

const sendNotification = require(`../../core/sendNotification`);
const { createDialog } = require(`../../core/createDialog`);

const { inspect } = require(`util`);

let wss = null;

module.exports = async ({ browserConnector }) => {
    if(!wss && browserConnector) {
        console.log(`[browserConnector { general }] getting build info...`);

        const buildInfo = {};

        const parseBuild = (conf) => {
            Object.assign(buildInfo, {
                name: conf.productName || conf.name,
                version: package.version,
            });

            if(conf.extraMetadata) {
                buildInfo.commit = conf.extraMetadata.commitHash;
            }
        }

        if(await getPath(`./build.json`, true, false, true)) {
            parseBuild(require(`../../build.json`));
        } else if(await getPath(`./build.js`, true, false, true)) {
            parseBuild(await require(`../../build.js`).getFullMetadata());
        } else {
            parseBuild(package);
        }

        console.log(`[browserConnector { general }] retrieved build info!`, buildInfo);

        console.log(`[browserConnector { general }] creating WS server...`);

        wss = new ws.Server({ port: 38529 }); // random port that is not used by anything else according to this stackoverflow post: https://stackoverflow.com/questions/10476987/best-tcp-port-number-range-for-internal-applications

        wss.on('connection', async (ws, req) => {
            const id = idGen(16);

            const session = {};

            ws.id = id;

            ws.once('close', () => {
                console.log(`[browserConnector/${id}] ws connection closed!`);

                if(ws.dialog && ws.dialog.callback) {
                    ws.dialog.callback(null, ws.dialog.id, null, null);
                }
            });

            let messageHandler = () => {};

            const handle = async (attempt=0) => {
                console.log(`[browserConnector/${id}] ws connection established!`, req);
    
                console.log(`[browserConnector/${id}] creating keypair for encryption...`);
    
                const { fingerprint, decrypt, generatePublicKey } = await authentication.getToken(`browserConnector`);
    
                console.log(`[browserConnector/${id}] retrieved keypair! (fingerprint: ${fingerprint})`);

                messageHandler = msg => {
                    try {
                        const obj = JSON.parse(decrypt(msg));

                        if(obj.type == `ready`) {
                            messageHandler = () => {};

                            if(ws.dialog && ws.dialog.window) {
                                ws.dialog.window.close();
                                ws.dialog = null;
                            }

                            console.log(`[browserConnector/${id}] received encrypted ready message!`);

                            const handler = require(`../browserConnectorHandler`)({ session, id })

                            messageHandler = msg => {
                                let decrypted = null;

                                try {
                                    decrypted = JSON.parse(decrypt(msg));
                                } catch(e) {
                                    return console.error(`[browserConnector/${id}] failed decrypting msg: ${e}`)
                                };

                                try {
                                    handler(JSON.parse(decrypted));
                                } catch(e) {
                                    console.error(`[browserConnector/${id}] failed to handle authenticated msg: ${e}`)
                                }
                            };

                            ws.send(JSON.stringify({ type: `ready` }))
                        }
                    } catch(e) {
                        try {
                            const obj = JSON.parse(msg.toString());
    
                            if(obj.type == `pair`) {
                                const strings = [
                                    `A browser connector is trying to pair with this instance of ezytdl.`,
                                    `To continue, please verify that the information presented here matches the one shown in the browser. If all looks well, click "Pair" in the browser to continue.`,
                                    `**Encryption Fingerprint:** \`${fingerprint}\``,
                                    `Connection details:\n- ${Object.entries(session).reverse().map(([k, v]) => `\`${k}\`: \`${v}\``).join(`\n- `)}`
                                ]
    
                                createDialog({
                                    title: `Browser Connector Pairing`,
                                    body: strings.join(`\n\n`),
                                }, o => {
                                    ws.dialog = o;
                                }).then(() => {
                                    ws.dialog = null;
                                });
                                
                                return console.log(`[browserConnector/${id}] started pairing process!`, obj);
                            } else if(obj.type == `key`) {
                                console.log(`[browserConnector/${id}] generating public key!`, obj);

                                const data = generatePublicKey();

                                console.log(`[browserConnector/${id}] sending public key!`);

                                return ws.send(JSON.stringify({ type: `key`, data }));
                            } else console.log(`[browserConnector/${id}] received unknown message type: ${obj.type}`, obj);
                        } catch(e2) {
                            console.error(`[browserConnector/${id}] failed to decrypt mid-handshake message!`, e, e2);
                        };

                        ws.close();
                    }
                };

                ws.send(JSON.stringify({
                    type: `handshake`,
                    data: { id, fingerprint }
                }));
            };

            messageHandler = msg => {
                try {
                    const obj = JSON.parse(msg.toString());

                    if(obj.type == `hello`) {
                        console.log(`[browserConnector/${id}] received hello message!`, obj.data);
                        Object.assign(session, obj.data)
                        return handle();
                    } else {
                        console.log(`[browserConnector/${id}] received unknown message type: ${obj.type}`, obj);
                    }
                } catch(e) {
                    console.error(`[browserConnector/${id}] failed to parse initial message!`, e);
                };
                
                ws.close();
            }

            ws.on('message', (...data) => messageHandler(...data));

            ws.send(JSON.stringify({
                type: `hello`,
                data: buildInfo
            }));
        });

        wss.on('error', e => {
            console.error(`[browserConnector { general }] ws server error!`, e);
        });

        console.log(`[browserConnector { general }] ws server created!`);
    } else if(wss && !browserConnector) {
        console.log(`[browserConnector { general }] closing ws server...`);

        let closingPromises = [];

        const clientCount = wss.clients.size;
        let closedCount = 0;
        
        wss.clients.forEach((socket) => {
            closingPromises.push(new Promise(res => {
                socket.once(`close`, () => {
                    closedCount++;
                    console.log(`[browserConnector/${socket.id} { general }] socket closed in server shutdown! (${closedCount}/${clientCount})`);
                    res();
                });

                socket.close();

                setTimeout(() => {
                    if(socket.readyState != socket.CLOSED) {
                        console.log(`[browserConnector/${socket.id} { general }] socket did not close in time! terminating.`);
                        socket.terminate();
                    }
                }, 500)
            }))
        });

        console.log(`[browserConnector { general }] waiting for ${closingPromises.length} sockets to close...`);

        await Promise.all(closingPromises);

        wss.once('close', () => {
            console.log(`[browserConnector { general }] ws server closed.`);
        });

        wss.close();
        wss = null;
    }
}