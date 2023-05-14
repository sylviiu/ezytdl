const { getPath } = require(`./filenames/ffmpeg`)
const { spawn } = require('child_process');

const electronPath = require('electron').app.getAppPath();

const sendNotification = require("../core/sendNotification.js");

let working = { "checked": false };

let promise = null;

const constructPromise = (name, accelArgs) => new Promise((res) => {
    let pre = (accelArgs.pre || []).slice(0);
    let post = (accelArgs.post || []).slice(0);

    if(post.indexOf(`-c:v`) == -1) post.push(`-c:v`, `h264`);
    if(post.indexOf(`-f`) == -1) post.push(`-f`, `null`);

    let file = electronPath.includes(`app.asar`) ? `${electronPath.replace(`app.asar`, `app.asar.unpacked`)}/res/sample.mp4` : `./res/sample.mp4`;

    const proc = spawn(getPath(), [`-hide_banner`, `-loglevel`, `error`, ...pre, `-i`, file, `-threads`, `1`, ...post, `-`, `-benchmark`]);

    let complete = false;

    setTimeout(() => {
        if(!complete) {
            complete = true;
            res({ name, works: false, log: str + `\n[ DID NOT COMPLETE IN TIME ]`, pre: accelArgs.pre || [], post: accelArgs.post || [], string: accelArgs.string })
        }
    }, 2500)

    let str = ``;

    proc.stderr.on(`data`, (data) => {str += name + " !> " + data.toString().trim()})
    proc.stdout.on(`data`, (data) => {str += name + " +> " + data.toString().trim()})

    proc.on(`close`, (code) => {
        console.log(`${name} exited with code ${code}`);

        if(!complete) {
            complete = true;

            res({ name, works: code == 0 ? true : false, log: str, pre: accelArgs.pre || [], post: accelArgs.post || [], string: accelArgs.string })
        }
    })

    proc.on(`error`, (e) => {
        console.log(`${name} failed; ${e}`)
    })
})

module.exports = () => {
    let path = getPath();
    
    if(!working.checked) {
        if(promise) {
            return promise;
        } else if(!path || !require('fs').existsSync(path)) {
            return null;
        } else {
            promise = new Promise((res, rej) => {
                const transcoders = require(`./ffmpegGPUArgs.json`);

                let tested = {};

                for (transcoder of Object.keys(transcoders)) tested[transcoder] = constructPromise(transcoder, transcoders[transcoder])

                Promise.allSettled(Object.values(tested)).then((results) => {
                    console.log(`-------\nFFMPEG TESTING COMPLETE\n-------`);
                    let o = {};
                    results.map(o => o.value).forEach(result => {
                        let obj = result;

                        o[result.name] = obj;
                        if(result.works) {
                            working[result.name] = obj;
                            if(!working.use) working.use = obj;
                        }
                    });
                    console.log(o);

                    if(working.use) {
                        let obj = Object.assign({}, working);
                        delete obj.use;

                        sendNotification({
                            headingText: `GPU Acceleration Enabled!`,
                            bodyText: `GPU acceleration has been enabled for your system. This will improve performance when converting videos.\n\nEnabled: ${Object.values(obj).filter(o => typeof o == `object` && o.name).map(o => o.name).join(`, `)}`,
                        });
                    }

                    working.checked = true;

                    res(working)
                });
            });

            return promise;
        }
    } else return new Promise(r => r(working))
}