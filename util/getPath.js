const electronPath = require('electron').app.getAppPath();
const fs = require('fs');
const path = require('path');

module.exports = (filePath, allowNull) => {
    const splitPath = filePath.split(`/`);

    if(splitPath[0] == `.`) splitPath.shift()
    if(splitPath[0] == ``) splitPath.shift()

    const originalPath = path.join(electronPath, ...splitPath);
    const unpackedPath = path.join(electronPath.replace(`app.asar`, `app.asar.unpacked`), ...splitPath);
    const relativePath = path.join(...__dirname.split(`util`).slice(0, -1).join(`core`).split(`/`), ...splitPath);

    if(fs.existsSync(unpackedPath)) {
        return unpackedPath
    } else if(fs.existsSync(originalPath)) {
        return originalPath
    } else if(fs.existsSync(relativePath)) {
        return relativePath
    } else {
        if(allowNull) {
            return null
        } else throw new Error(`File doesn't exist in any of the following:\n\nOriginal path: ${filePath}\n\n- ${originalPath}\n- ${unpackedPath}\n- ${relativePath}`);
    }
}