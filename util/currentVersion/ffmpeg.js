const { file, getPath } = require(`../filenames/ffmpeg`);

const fs = require('fs');
const child_process = require('child_process');

let currentVersion = null;
let currentVersionPath = null;

module.exports = (forceCheck, getBuildDate, clear) => new Promise(async (res, rej) => {
    let path = getPath()
    
    if(clear) {
        currentVersion = null;
        currentVersionPath = null;
        res(true);
    } else if(!forceCheck && currentVersion && (path == currentVersionPath)) {
        return res(currentVersion);
    } else {
        const exists = path;
        console.log(`Exists? ${exists}`)

        if(exists) {
            child_process.execFile(path, [`-version`], (err, stdout, stderr) => {
                if(stderr) console.log(`STDERR`, stderr.toString());
                if(err) console.error(err)
                if(err) return res(null)
                if(!stdout) return res(null);
                const versionString = stdout.toString().trim();
        
                currentVersion = versionString.split(`version `)[1].trim().split(` `).slice(0, 1)[0].split(`-`)[0];
                currentVersionPath = path;

                return res(currentVersion)
            });
        } else {
            console.log(`File doesn't exist, returning null`);
            return res(false)
        }
    }
})