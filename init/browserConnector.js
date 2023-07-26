const pfs = require(`../util/promisifiedFS`);
const getPath = require(`../util/getPath`);

module.exports = () => new Promise(async res => {
    const { app } = require(`electron`);

    const opt = {
        buildArgs: require((await getPath(`./build.json`, true, false, true)) || `../build.js`),
        package: require(`../package.json`),
        path: require(`path`).join(require(`electron`).app.getAppPath(), (`ezytdl` + (process.platform == `win32` ? `.exe` : ``))),
    };

    if(await pfs.existsSync(opt.path) /*true*/) {
        console.log(`connector opts:`, opt);
    
        const connectors = (await pfs.readdirSync(await getPath(`./init/browserConnectors`, false, false, true))).filter(f => f.endsWith(`.js`)).map(f => ({
            name: f.split(`.`).slice(0, -1).join(`.`),
            func: require(`./browserConnectors/${f}`)
        }));
    
        console.log(`connectors:`, connectors);
    
        const promises = [];
    
        for(const { name, func } of connectors) {
            console.log(`running connector`, name);
            promises.push(func(opt));
        }
    } else {
        console.log(`ezytdl not found at ${opt.path}`);
        res();
    }
})