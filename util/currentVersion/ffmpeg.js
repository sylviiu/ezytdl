const { file, getPath } = require(`../filenames/ffmpeg`);

const fs = require('fs');
const child_process = require('child_process');

let currentVersion = null;

module.exports = (forceCheck) => new Promise(async res => {
    let path = getPath()
    
    if(!forceCheck && currentVersion) {
        return res(currentVersion);
    } else {
        const exists = path;
        console.log(`Exists? ${exists}`)

        if(exists) {
            const proc = child_process.spawnSync(path, [`-version`]);
            //const versionString = child_process.execSync(`${path} -version`).toString().trim();
            if(!proc.stdout) return res(null);
            const versionString = proc.stdout.toString().trim();
    
            currentVersion = versionString.split(`version `)[1].split(` `)[0].split(`-`)[0];
        
            return res(currentVersion)
        } else {
            console.log(`File doesn't exist, returning null`);
            return res(null)
        }
    }
})