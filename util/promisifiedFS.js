const util = require('util');
const fs = require('fs');

const custom = fs.readdirSync(require('./getPath')(`./util/promisifiedFS`)).filter(f => f.endsWith(`.js`));

const blacklisted = [`createWriteStream`, `createReadStream`, `writeFileSync`]

const promisified = {};

for(const key of Object.keys(fs)) {
    const isBlacklisted = blacklisted.find(s => s == key);

    if(!isBlacklisted && typeof fs[key] === 'function') {
        //promisified[key] = util.promisify(fs[key]);

        let useFuncKey = `default`
        let useFunc = fs[key];

        if(custom.find(f => f.split(`.js`)[0] == key)) {
            useFuncKey = `key/custom`;
            useFunc = require(`./promisifiedFS/${key}`);
        } else if(fs.promises[key.split(`Sync`)[0]]) {
            useFuncKey = key.split(`Sync`)[0];
            useFunc = fs.promises[key.split(`Sync`)[0]];
        } else if(fs.promises[key]) {
            useFuncKey = key;
            useFunc = fs.promises[key];
        } else {
            useFuncKey = `${key}/util.promisify`
            useFunc = util.promisify(fs[key]);
        };

        promisified[key] = (...args) => {
            //console.log(`FS promisified ${key} (${useFuncKey}) with ${args.length} args`);

            const func = useFunc(...args);

            if(func.then) {
                //func.then((...r) => console.log(`FS promisified ${key} (${useFuncKey}) resolved with ${r.length} args`));
                return func;
            } else {
                //console.log(`FS promisified ${key} (${useFuncKey}) resolved with ${func.length} args (not a promise)`);
                return Promise.resolve(func);
            }
        };
    } else if(isBlacklisted && typeof fs[key] === 'function') {
        promisified[key] = (...args) => Promise.resolve(fs[key](...args));
    } else {
        promisified[key] = fs[key];
    }
};

module.exports = promisified;