const crypto = require('crypto');

module.exports = {
    hoist: require(`./strings.json`).system,
    description: `Encryption keys for securing communication between the ezytdl browser extension and the app.`,
    icons: [`trash`, `cog`],
    buttons: [`Remove`, `Generate`],
    getToken: ({ cryptoArgs, privateKey }={}) => new Promise(async res => {
        if(cryptoArgs && privateKey) {
            const fingerprint = crypto.createHash('sha256').update(privateKey).digest('hex');

            const publicKey = crypto.createPublicKey(privateKey).export(cryptoArgs.generateArgs.publicKeyEncoding);

            res({
                value: Object.assign({
                    decrypt: (data) => crypto.privateDecrypt(Object.assign({ key: privateKey }, (cryptoArgs.decryptArgs || {})), Buffer.isBuffer(data) ? data : Buffer.from(data)),
                    encrypt: (data) => crypto.publicEncrypt(Object.assign({ key: publicKey }, (cryptoArgs.encryptArgs || {})), Buffer.isBuffer(data) ? data : Buffer.from(data)),
                }, { cryptoArgs, publicKey, privateKey, fingerprint }),
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
                res({ cryptoArgs, privateKey })
            }
        });
    }),
    
    complete: `The encryption keys for securing communication between the extension and the app have been generated!`,
}