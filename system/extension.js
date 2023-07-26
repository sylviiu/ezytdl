const net = require('net');
const pfs = require('../util/promisifiedFS');
const crypto = require('crypto');
const { app } = require('electron');

const idGen = require(`../util/idGen`);

const ENCRYPT_TYPE = `rsa`;

const cleanup = (PIPEPATH, type) => new Promise(async res => {
    console.log(`[${PIPEPATH}/${type}] cleanup`)

    if(await pfs.existsSync(PIPEPATH)) try {
        await pfs.unlinkSync(PIPEPATH);
        console.log(`[${PIPEPATH}/${type}] pipe deleted`);
    } catch(e) {
        console.log(`[${PIPEPATH}/${type}] failed to delete pipe: ${e.message}`);
    } else console.log(`[${PIPEPATH}/${type}] pipe file doesn't exist`);

    res();
})

const encryptSocket = (socket, key) => Object.assign({}, socket, {
    write: data => socket.write(crypto.publicEncrypt(key, Buffer.from(typeof data == `object` ? JSON.stringify(data) : data))),
    on: (event, func) => socket.on(event, data => func(crypto.privateDecrypt(key, Buffer.from(data)))),
    once: (event, func) => socket.once(event, data => func(crypto.privateDecrypt(key, Buffer.from(data)))),
    close: () => socket.close ? socket.close() : socket.end(),
})

module.exports = async () => {
    const PIPEPATH = (process.platform == `win32` ? `\\\\.\\pipe\\ezytdl-pipe` : `/tmp/ezytdl-sock`) + `-` + idGen(16);

    const server = net.createServer(socket => {
        console.log(`[${PIPEPATH}/server] client connected`);

        socket.once('data', data => {
            console.log(`[${PIPEPATH}/server] initial setup -- received data of length ${data.length}`);

            const str = data.toString().trim();

            console.log(`[${PIPEPATH}/server] key not set, attempting exchange process...`);

            try {
                const o = JSON.parse(str);

                if(o.type == `key-exchange`) {
                    const sessionKey = crypto.randomBytes(32).toString(`hex`);

                    const encrypted = crypto.publicEncrypt(o.key, Buffer.from(sessionKey));
                    
                    // ^ this is how to encrypt any message with the public key

                    console.log(`[${PIPEPATH}/server] encrypted key: ${sessionKey}`);

                    socket.write(JSON.stringify({ type: `key-exchange`, key: encrypted }));

                    return require(`./extension/connector`)(encryptSocket(socket, sessionKey), (...d) => console.log(`[${PIPEPATH}/server]`, ...d));
                } else {
                    console.log(`[${PIPEPATH}/server] received invalid non-exchanged type: "${o.type}"`);
                }
            } catch(e) {
                console.error(`[${PIPEPATH}/server] failed at exchange process: ${e.message}`);
            }

            server.close();
        });

        socket.on('end', () => {
            console.log(`[${PIPEPATH}/server] client disconnected`);
            server.close();
        });
    });

    server.once('close', async () => {
        console.log(`[${PIPEPATH}/server] server closed`);

        await cleanup(PIPEPATH, `server`);
        
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

module.exports.client = async ({ PIPEPATH }) => {
    const { publicKey, privateKey } = await new Promise(async res => {
        crypto.generateKeyPair(ENCRYPT_TYPE, {
            modulusLength: 4096,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            },
        }, (err, publicKey, privateKey) => {
            if(err) throw err;

            res({ publicKey, privateKey });
        });
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

    client.once('data', data => {
        const str = data.toString().trim();

        console.log(`[${PIPEPATH}/client] key not set, attempting exchange process... (data of length ${str.length})`);

        try {
            const o = JSON.parse(str);

            if(o.type == `key-exchange`) {
                console.log(`[${PIPEPATH}/client] received key`);

                const decrypted = crypto.privateDecrypt(privateKey, Buffer.from(o.key));

                console.log(`[${PIPEPATH}/client] decrypted key: ${decrypted.toString()}`);

                return require(`./extension/main`)(encryptSocket(client, decrypted.toString()), (...d) => console.log(`[${PIPEPATH}/client]`, ...d));
            } else console.log(`[${PIPEPATH}/client] received invalid non-exchanged type: "${o.type}"`);
        } catch(e) {
            console.error(`[${PIPEPATH}/client] failed at exchange process: ${e.message}`);
        }

        return client.end();
    });

    client.on('end', async () => {
        console.log(`[${PIPEPATH}/client] disconnected`);
        
        await cleanup(PIPEPATH, `server`);
    });

    client.on('error', err => {
        console.error(`[${PIPEPATH}/client] error: ${err.message}`);
    });
}