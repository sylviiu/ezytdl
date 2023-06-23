const { file, getPath } = require(`../filenames/ffmpeg`);

const fs = require('fs');
const child_process = require('child_process');

let currentVersion = null;
let currentDateString = null;

module.exports = (forceCheck, getBuildDate) => new Promise(async (res, rej) => {
    let path = getPath()
    
    if(!forceCheck && currentDateString && path && getBuildDate) {
        return res(currentDateString);
    } else if(!forceCheck && currentVersion && path && !getBuildDate) {
        return res(currentVersion);
    } else {
        const exists = path;
        console.log(`Exists? ${exists}`)

        if(exists) {
            child_process.execFile(path, [`-version`], (err, stdout, stderr) => {
                if(stderr) console.log(`STDERR`, stderr.toString());
                if(err) return rej(err)
                //const versionString = child_process.execSync(`${path} -version`).toString().trim();
                if(!stdout) return res(null);
                const versionString = stdout.toString().trim();
        
                currentVersion = versionString.split(`version `)[1].trim().split(` `).slice(0, 1)[0];
                currentDateString = `${currentVersion}`.split(`-`).slice(-1)[0];

                if(getBuildDate) {
                    return res(`${currentVersion}`.split(`-`).slice(-1)[0])
                } else return res(currentVersion)
            });
        } else {
            console.log(`File doesn't exist, returning null`);
            return res(null)
        }
    }
})