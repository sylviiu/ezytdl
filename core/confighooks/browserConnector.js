const ws = require('ws');
const idGen = require(`../../util/idGen`);

const { inspect } = require(`util`);

const authentication = require(`../authentication`);

const clients = new Map();

let wss = null;

module.exports = async ({ browserConnector }) => {
    if(!wss && browserConnector) {
        console.log(`[browserConnector { general }] creating WS server...`);

        wss = new ws.Server({ port: 38529 }); // random port that is not used by anything else according to this stackoverflow post: https://stackoverflow.com/questions/10476987/best-tcp-port-number-range-for-internal-applications

        wss.on('connection', async (ws, req) => {
            const id = idGen(16);

            console.log(`[browserConnector/${id}] ws connection established!`, req);

            console.log(`[browserConnector/${id}] creating keypair for encryption...`);

            const { fingerprint, encrypt, decrypt, publicKey } = await authentication.getToken(`browserConnector`);

            console.log(`[browserConnector/${id}] retrieved keypair! (fingerprint: ${fingerprint})`);

            const testStr = idGen(16);

            const encryptTest = encrypt(testStr);
            const decryptTest = decrypt(encryptTest).toString();

            const encryptionTestStrings = [ `original string: ${inspect(testStr)}`, `encrypted: ${inspect(encryptTest)}`, `decrypted: ${inspect(decryptTest)}` ];

            const glue = `\n[browserConnector/${id}] - `

            console.log(`\n[browserConnector/${id}] encryption test:` + glue + encryptionTestStrings.join(glue) + `\n`);

            ws.once('close', () => {
                if(clients.has(id)) clients.delete(id);
            });

            ws.on('message', raw => {
                console.log(`[browserConnector/${id}] received raw data; type: ${typeof raw}; bytes: ${Buffer.byteLength(raw)}`);

                try {
                    let str = decrypt(raw).toString();

                    try { str = JSON.parse(decrypt(raw)); } catch(e) { };

                    console.log(`[browserConnector/${id}] received data [ ${typeof str} ]:`, str);
                } catch(e) {
                    console.error(`[browserConnector/${id}] failed to decrypt data! (${e})`);
                    ws.close();
                }
            });

            clients.set(id, { ws });

            ws.send(JSON.stringify({ type: `key-exchange`, key: publicKey }));
        });

        wss.on('error', e => {
            console.error(`[browserConnector { general }] ws server error!`, e);
        });

        console.log(`[browserConnector { general }] ws server created!`);
    } else if(wss && !browserConnector) {
        console.log(`[browserConnector { general }] closing ws server...`);

        wss.once('close', () => {
            clients.clear();
    
            console.log(`[browserConnector { general }] ws server closed.`);
        });

        wss.close();
        wss = null;
    }
}