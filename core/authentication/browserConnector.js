const crypto = require('crypto');

module.exports = {
    hoist: require(`./strings.json`).system,
    description: `Encryption keys for securing communication between the ezytdl browser extension and the app.`,
    extendedDescription: () => new Promise(async res => {
        const { browserConnector } = await require(`../../getConfig`)();

        console.log(`extendeddescription: ${browserConnector}`)

        if(browserConnector) {
            require(`../authentication`).getKey(`browserConnector`).then(r => {
                console.log(`extendeddescription`, r)
                if(r && r.fingerprint) {
                    res(`Generated fingerprint: ${r.fingerprint}`)
                } else {
                    res(false)
                }
            })
        } else res(false);
    }),
    icons: [`trash`, `cog`],
    buttons: [`Remove`, `Generate`],
    getToken: ({ cryptoArgs, fingerprint, privateKey }={}) => new Promise(async res => {
        if(cryptoArgs && fingerprint && privateKey) {
            const started = Date.now();

            console.log(`creating public key to pair with private key...`)

            console.log(`Took [${Date.now() - started}ms] to create public key!`)

            const tools = {
                generatePublicKey: () => crypto.createPublicKey(privateKey).export(cryptoArgs.generateArgs.publicKeyEncoding),
                decrypt: (data) => crypto.privateDecrypt(Object.assign({ key: privateKey }, (cryptoArgs.decryptArgs || {})), Buffer.isBuffer(data) ? data : Buffer.from(data)),
                encrypt: (data, key) => crypto.publicEncrypt(Object.assign({ key: key || tools.generatePublicKey() }, (cryptoArgs.encryptArgs || {})), Buffer.isBuffer(data) ? data : Buffer.from(data)),
            }

            tools.decryptSymmetric = (data) => {
                if(Buffer.isBuffer(data)) data = data.toString();

                if(data.type == `Buffer`) {
                    data = Buffer.from(data.data).toString();
                }

                if(typeof data == `string`) try {
                    data = JSON.parse(data);
                    for(const key of Object.keys(data)) data[key] = Array.isArray(data[key]) ? new Uint8Array(data[key]) : data[key];
                } catch(e) {
                    throw new Error(`failed to stringify data! (${e})`);
                }

                //console.log(`decryptSymmetric (${typeof data}):`, data);

                if(data.key && data.data) {
                    let key;

                    try {
                        key = tools.decrypt(data.key);
                        //console.log(`decrypted key (${key.byteLength} bytes)`, Uint8Array.from(key));
                    } catch(e) {
                        throw new Error(`failed to decrypt key! (${e})`);
                    }
    
                    try {
                        const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(data.iv));

                        const buf = Buffer.from(data.data);

                        //console.log(`deciphering data (${buf.byteLength} bytes)...`, Uint8Array.from(buf));

                        const decryptedData = Buffer.concat([
                            decipher.update(buf), 
                            decipher.final()
                        ]).toString('utf-8');

                        return decryptedData;
                    } catch(e) {
                        throw new Error(`failed to decrypt message from symmetric key! (${e})`);
                    }
                } else {
                    throw new Error(`missing key or data!`);
                }
            }

            res({
                value: Object.assign(tools, { cryptoArgs, privateKey, fingerprint }),
                message: null
            })
        } else res({ value: null, message: `missing keys, or privatekey.` });
    }),
    setup: () => new Promise(async res => {
        const cryptoArgs = {
            type: 'rsa',

            generateArgs: {
                modulusLength: 4096,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
            },

            decryptArgs: {
                oaepHash: 'sha256',
            },

            encryptArgs: {
                oaepHash: 'sha256',
            },
        };

        crypto.generateKeyPair(cryptoArgs.type, cryptoArgs.generateArgs, (err, publicKey, privateKey) => {
            if(err || !privateKey) {
                res(`failed to generate keypair: ${err || `(missing key)`}`)
            } else {
                const fingerprint = `[ ${crypto.createHash('sha256').update(privateKey).digest('hex').split(/(.{2})/).filter(Boolean).join(` `)} ]`;
                res({ cryptoArgs, fingerprint, privateKey })
            }
        });
    }),
    
    complete: `The encryption keys for securing communication between the extension and the app have been generated!`,
}