const which = require(`which`);
const path = require(`path`);

const pyenvPath = path.join(global.configPath, `pyenv`);

module.exports = {
    getPaths: () => new Promise(async resolve => {
        const { bindir } = module.exports;

        if(!module.exports.pythonPath) module.exports.pythonPath = await new Promise(async res => which(`python3`).then(res).catch((e) => {
            console.log(`python3 failed: ${e}`)
            which(`py`).then(res).catch((e) => {
                console.log(`py failed: ${e}`)
                console.log(`python not installed`)
            })
        }));

        if(module.exports.pythonPath) {
            global.useBridge = true;
            console.log(`new pythonPath: ${module.exports.pythonPath}`);
        }

        resolve();
    }),
    pythonPath: null,
    pyenvPath,
    bindir: process.platform == `win32` ? path.join(pyenvPath, `Scripts`) : path.join(pyenvPath, `bin`),
}