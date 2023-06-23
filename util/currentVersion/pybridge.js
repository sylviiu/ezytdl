const { file, getPath } = require(`../filenames/pybridge`);

const child_process = require('child_process');

let currentVersion = null;
let currentDateString = null;

module.exports = (forceCheck, getBuildDate) => new Promise(async (res, rej) => {
    let path = getPath()

    if(!forceCheck && currentDateString && path && getBuildDate) {
        return res(currentDateString);
    } else if(!forceCheck && currentVersion && path) {
        return res(currentVersion);
    } else {
        const exists = path;
        console.log(`Exists? ${exists}`)

        if(exists) {
            child_process.execFile(path, [`--version`], (err, stdout, stderr) => {
                if(err) return rej(err);
                
                if(!stdout && !stderr) return res(null);
                
                let versionString = stdout.toString().includes(`Build number: `) ? stdout.toString().split(`Build number: `)[1].split(`\n`)[0].trim() : null;
                if(!versionString) versionString = stderr.toString().includes(`Build number: `) ? stderr.toString().split(`Build number: `)[1].split(`\n`)[0].trim() : null;
        
                currentVersion = versionString;
    
                console.log(`pybridge version: ${versionString}`)
                
                let dateString = stdout.toString().includes(`Built: `) ? stdout.toString().split(`Built: `)[1].split(`\n`)[0].trim() : null;
                if(!dateString) dateString = stderr.toString().includes(`Built: `) ? stderr.toString().split(`Built: `)[1].split(`\n`)[0].trim() : null;

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
            });
        } else {
            console.log(`File doesn't exist, returning null`);
            return res(null)
        }
    }
})