const electronPath = require('electron').app.getAppPath();
const fs = require('fs');
const existsFunc = require(`./promisifiedFS/existsSync`);
const path = require('path');

module.exports = (filePath, allowNull, debug, promise=false) => {
    console.log(`getPath ${filePath} (promise: ${promise})`)

    if(filePath.startsWith(`./`)) filePath = filePath.slice(2)

    const splitPath = filePath.split(`/`);

    if(splitPath[0] == `.`) splitPath.shift()
    if(splitPath[0] == ``) splitPath.shift()

    const originalPath = path.join(electronPath, ...splitPath);
    const unpackedPath = path.join(electronPath.replace(`app.asar`, `app.asar.unpacked`), ...splitPath);
    const noasarPath = path.join(electronPath.replace(`app.asar`, ``), ...splitPath);
    const nounpackedasarPath = path.join(electronPath.replace(`app.asar.unpacked`, ``), ...splitPath);
    const relativePath = path.join(...__dirname.split(`util`).slice(0, -1).join(`core`).split(`/`), ...splitPath);

    if(debug) {
        console.log(`\n\noriginalPath: ${originalPath}\nunpackedPath: ${unpackedPath}\nnoasarPath: ${noasarPath}\nnounpackedasarPath: ${nounpackedasarPath}\nrelativePath: ${relativePath}\n\n`)
    };

    const checks = {originalPath, unpackedPath, noasarPath, nounpackedasarPath, relativePath};

    const errorMsg = `File doesn't exist in any of the following:\n\nOriginal path: ${filePath}\n${Object.entries(checks).map(([name, path]) => `\n- ${name}: ${path}`).join(`\n`)}`;

    let exists = null;

    if(promise) {
        return new Promise(async (res, rej) => {
            for(const check of Object.values(checks)) {
                if(await existsFunc(check)) {
                    exists = check;
                    break;
                }
            }
    
            if(exists || allowNull) {
                res(exists)
            } else rej(new Error(errorMsg));
        });
    } else {
        for(const check of Object.values(checks)) {
            if(fs.existsSync(check)) {
                exists = check;
                break;
            }
        }
    
        if(exists || allowNull) {
            return exists;
        } else throw new Error(errorMsg);
    }
}