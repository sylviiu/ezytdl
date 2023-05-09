const { file, path } = require(`./filenames/ytdlp`);

const fs = require('fs');
const child_process = require('child_process');

let currentVersion = null;

module.exports = (forceCheck) => new Promise(async res => {
    if(!forceCheck && currentVersion) {
        return res(currentVersion);
    } else {
        const exists = fs.existsSync(path);
        console.log(`Exists? ${exists}`)

        if(exists) {
            const versionString = child_process.execSync(`${path} --version`).toString().trim();
    
            currentVersion = versionString;
        
            return res(versionString)
        } else {
            console.log(`File doesn't exist, returning null`);
            return res(null)
        }
    }
})