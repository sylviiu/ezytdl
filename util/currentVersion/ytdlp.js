const { file, getPath } = require(`../filenames/ytdlp`);

const fs = require('fs');
const child_process = require('child_process');

let currentVersion = null;

module.exports = (forceCheck) => new Promise(async (res, rej) => {
    let path = getPath()

    if(!forceCheck && currentVersion && path) {
        return res(currentVersion);
    } else {
        const exists = path;
        console.log(`Exists? ${exists}`)

        if(exists) {
            let busy = 1;
    
            while(busy) await new Promise(async r => {
                require('fs').open(path, 'w', (err, fd) => {
                    if(err && err.code == `EBUSY`) {
                        console.log(`File "${path}" locked... (attempt ${busy})`)
                        busy++;
                        if(fd) require('fs').close(fd)
                        setTimeout(() => r(), 1000);
                    } else {
                        console.log(`File "${path}" not busy (attempt ${busy})`)
                        busy = false;
                        if(fd) require('fs').close(fd)
                        r();
                    }
                });
            });
            
            child_process.execFile(path, [`--version`], (err, stdout, stderr) => {
                if(stderr) console.log(`STDERR`, stderr.toString());
                if(err) return res(null)
                //const versionString = child_process.execSync(`${path} --version`).toString().trim();
                if(!stdout) return res(null);
                const versionString = stdout.toString().trim();
        
                currentVersion = versionString;
            
                return res(currentVersion)
            });
        } else {
            console.log(`File doesn't exist, returning null`);
            return res(false)
        }
    }
})