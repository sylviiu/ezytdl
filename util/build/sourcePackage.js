const path = require(`path`);

const getPath = require(`../getPath`);
const pfs = require(`../promisifiedFS`);

const lock = Object.entries(require(`../../package-lock.json`).packages)
    .map(([k, v]) => ({ [k.split(`node_modules/`).pop()]: v }))
    .reduce((a, b) => Object.assign(a, b), {});

console.log(`lock`, lock)

module.exports = (name) => new Promise(async res => {
    const resObj = {};

    try {
        const packageFilePath = await getPath(`./node_modules/${name}/package.json`, false, false, true);
        const packageFile = await pfs.readFileSync(packageFilePath, `utf8`);
        const package = JSON.parse(packageFile);

        resObj.pkg = package;
    } catch(e) {
        console.log(`Error reading package.json for ${name}: ${e}`);
    }

    if(lock[name]) {
        resObj.lock = lock[name];
    };

    res(resObj);
})