const { file, getPath } = require(`../filenames/pybridge`);

const child_process = require('child_process');

let currentVersion = null;
let currentDateString = null;
let currentVersionPath = null;

module.exports = (forceCheck, getBuildDate, clear) => new Promise(async (res, rej) => {
    let path = getPath()

    if(clear) {
        currentVersion = null;
        currentDateString = null;
        currentVersionPath = null;
        res(true);
    } else if(!forceCheck && currentDateString && (path == currentVersionPath) && getBuildDate) {
        return res(currentDateString);
    } else if(!forceCheck && currentVersion && (path == currentVersionPath)) {
        return res(currentVersion);
    } else {
        const exists = path;
        console.log(`Exists? ${exists}`);

        if(exists) {
            /*let busy = 1;
    
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
            });*/
            
            child_process.execFile(path, [`--version-json`], {
                env: { ...process.env,
                    PYBRIDGE_HEADER_SUPPORTED_SITES: `true`,
                },
            }, (err, stdout, stderr) => {
                if(err) return res(null)

                try {
                    let version = JSON.parse((stdout ? stdout.toString().trim() : `` || stderr ? stderr.toString().trim() : ``));

                    require(`../pythonBridge`).bridgeVersions = version;

                    console.log(version);

                    let versionString = version['ezytdl-pybridge']['Build number'];
            
                    currentVersion = versionString;

                    currentVersionPath = path;
        
                    console.log(`pybridge version: ${versionString}`);

                    let dateString = version['ezytdl-pybridge']['Built'];
    
                    console.log(dateString);
    
                    if(dateString) {
                        let date = new Date(parseInt(dateString));
                        if(date.toString() !== `Invalid Date`) {
                            let m = date.getMonth()+1;
                            let d = date.getDate();
                            let y = date.getFullYear();
    
                            if(m < 10) m = `0${m}`;
                            if(d < 10) d = `0${d}`;
    
                            currentDateString = `${y}${m}${d}`;
                        }
                    }
    
                    if(getBuildDate) {
                        return res(currentDateString)
                    } else return res(currentVersion)
                } catch(e) {
                    rej(e);
                }
            });
        } else {
            console.log(`File doesn't exist, returning null`);
            return res(false)
        }
    }
})