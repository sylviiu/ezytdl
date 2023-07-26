const net = require('net');
const pfs = require('../util/promisifiedFS');
const crypto = require('crypto');
const { app } = require('electron');

const idGen = require(`../util/idGen`);

const ENCRYPT_TYPE = `rsa`;

module.exports = async () => {
    let sessionKey = null;

    const PIPEPATH = (process.platform == `win32` ? `\\\\.\\pipe\\ezytdl-pipe` : `/tmp/ezytdl-sock`) + `-` + idGen(16);

    const server = net.createServer(s => {
        console.log(`[${PIPEPATH}/server] client connected`);

        s.once('data', data => {
            console.log(`[${PIPEPATH}/server] initial setup -- received data of length ${data.length}`);

            const str = data.toString().trim();

            console.log(`[${PIPEPATH}/server] key not set, attempting exchange process...`);

            try {
                const o = JSON.parse(str);

                if(o.type == `key-exchange`) {
                    sessionKey = crypto.randomBytes(32).toString(`hex`);

                    const encrypted = crypto.publicEncrypt(o.key, Buffer.from(sessionKey));

                    //crypto.publicEncrypt( < string > , Buffer.from(sessionKey));

                    console.log(`[${PIPEPATH}/server] encrypted key: ${sessionKey}`);

                    s.write(JSON.stringify({ type: `key-exchange`, key: encrypted }));
                } else {
                    console.log(`[${PIPEPATH}/server] received invalid non-exchanged type: "${o.type}"`);
                    server.close();
                }
            } catch(e) {
                console.error(`[${PIPEPATH}/server] failed at exchange process: ${e.message}`);
                server.close();
            }
        });

        s.on('end', () => {
            console.log(`[${PIPEPATH}/server] client disconnected`);
            server.close();
        });
    });

    server.once('close', async () => {
        console.log(`[${PIPEPATH}/server] server closed`);

        if(await pfs.existsSync(PIPEPATH)) try {
            await pfs.unlinkSync(PIPEPATH);
            console.log(`[${PIPEPATH}/server] pipe deleted`);
        } catch(e) {
            console.log(`[${PIPEPATH}/server] failed to delete pipe: ${e.message}`);
        } else console.log(`[${PIPEPATH}/server] pipe file doesn't exist`);
        
        process.exit(0);
    });

    server.listen(PIPEPATH);

    const locked = app.requestSingleInstanceLock({ type: `extension`, PIPEPATH });

    if(locked) {
        console.log(`App is not running.`);
        process.exit(1);
    } else {
        console.log(`App is running.`);
    }
};

module.exports.client = ({ PIPEPATH }) => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync(ENCRYPT_TYPE, {
        modulusLength: 4096,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
        },
    });

    console.log(`[${PIPEPATH}/client] generated keypair`);

    const client = net.createConnection(PIPEPATH);

    console.log(`[${PIPEPATH}/client] connecting...`);

    client.on('connect', () => {
        console.log(`[${PIPEPATH}/client] Connected!`);

        console.log(`[${PIPEPATH}/client] generated keypair`);

        client.write(JSON.stringify({
            type: `key-exchange`,
            key: publicKey
        }));
    });

    let exchanged = false;

    client.on('data', data => {
        const str = data.toString().trim();

        console.log(`[${PIPEPATH}/client] received data of length ${str.length}`);

        if(!exchanged) {
            console.log(`[${PIPEPATH}/client] key not set, attempting exchange process...`);

            try {
                const o = JSON.parse(str);

                if(o.type == `key-exchange`) {
                    console.log(`[${PIPEPATH}/client] received key`);

                    const decrypted = crypto.privateDecrypt(privateKey, Buffer.from(o.key));

                    console.log(`[${PIPEPATH}/client] decrypted key: ${decrypted.toString()}`);

                    exchanged = true;
                } else console.log(`[${PIPEPATH}/client] received invalid non-exchanged type: "${o.type}"`);
            } catch(e) {
                console.error(`[${PIPEPATH}/client] failed at exchange process: ${e.message}`);
            }
        } else try {
            const o = JSON.parse(crypto.privateDecrypt(privateKey, Buffer.from(str)).toString());
            console.log(`[${PIPEPATH}/client]`, o);
        } catch(e) {
            console.error(`[${PIPEPATH}/client] failed to parse JSON: ${e.message} (from extension pipe)`);
        }
    });

    client.on('end', () => {
        console.log(`[${PIPEPATH}/client] disconnected`);
    });

    client.on('error', err => {
        console.error(`[${PIPEPATH}/client] error: ${err.message}`);
    });
}