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

            res({
                value: Object.assign({
                    generatePublicKey: () => crypto.createPublicKey(privateKey).export(cryptoArgs.generateArgs.publicKeyEncoding),
                    decrypt: (data) => crypto.privateDecrypt(Object.assign({ key: privateKey }, (cryptoArgs.decryptArgs || {})), Buffer.isBuffer(data) ? data : Buffer.from(data)),
                    encrypt: (data, key) => crypto.publicEncrypt(Object.assign({ key: key }, (cryptoArgs.encryptArgs || {})), Buffer.isBuffer(data) ? data : Buffer.from(data)),
                }, { cryptoArgs, privateKey, fingerprint }),
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