const { getPath } = require(`./filenames/ffmpeg`)
const { spawn } = require('child_process');
const { app } = require(`electron`);
const { Stream } = require('stream');

const fs = require('fs');

const findPath = require(`./getPath`);
const idGen = require(`./idGen`);
const superagent = require(`superagent`);

const constructPromise = (name, accelArgs, file) => new Promise((res) => {
    let pre = (accelArgs.pre || []).slice(0);
    let post = (accelArgs.post || []).slice(0);

    if(post.indexOf(`-c:v`) == -1) post.push(`-c:v`, `h264`);
    if(post.indexOf(`-f`) == -1) post.push(`-f`, `null`);

    const proc = spawn(getPath(), [`-hide_banner`, `-loglevel`, `error`, ...pre, `-i`, file, `-threads`, `1`, ...post, `-`, `-benchmark`]);

    let complete = false;

    setTimeout(() => {
        if(!complete) {
            complete = true;
            res({ name, works: false, log: str + `\n[ DID NOT COMPLETE IN TIME ]`, pre: accelArgs.pre || [], post: accelArgs.post || [], string: accelArgs.string })
        }
    }, 7500)

    let str = ``;

    proc.stderr.on(`data`, (data) => {str += name + " !> " + data.toString().trim()})
    proc.stdout.on(`data`, (data) => {str += name + " +> " + data.toString().trim()})

    proc.on(`close`, (code) => {
        console.log(`${name} exited with code ${code}`);

        if(!complete) {
            complete = true;

            res({ 
                name, 
                works: code == 0 ? true : false, 
                log: str, 
                pre: accelArgs.pre || [], 
                post: accelArgs.post || [], 
                string: accelArgs.string
            })
        }
    })

    proc.on(`error`, (e) => {
        console.log(`${name} failed; ${e}`)
    })
})

module.exports = (link, platforms, setProgress) => {
    let path = getPath();
    
    if(!path || !require('fs').existsSync(path)) {
        return null;
    } else {
        return new Promise((res, rej) => {
            setProgress(`Downloading file...`, -1)

            const tempPath = app.getPath(`temp`);

            const filename = link.split(`/`).slice(-1)[0];

            const destination = require(`path`).join(tempPath, idGen(24) + `-` + filename);

            console.log(`destination: ${destination}`)
    
            const writeStream = fs.createWriteStream(destination, { flags: `w` });
    
            const pt = new Stream.PassThrough();

            pt.pipe(writeStream);
    
            const req = superagent.get(link).set(`User-Agent`, `node`);

            req.pipe(pt).on(`progress`, event => {
                console.log(event)
                if(event.progress) setProgress(`Downloading file...`, Math.round(event.progress))
            });

            writeStream.once(`finish`, () => {
                setProgress(`Running tests on ${platforms.length} platforms...`, -1)

                const transcoders = require(`./ffmpegGPUArgs.json`);
    
                let tested = {};
    
                for(const transcoder of platforms) {
                    console.log(`[FFMPEG/HW -- USING] ${transcoder}`)

                    tested[transcoder] = constructPromise(transcoder, transcoders[transcoder], destination)
                };

                let i = 1;

                for(const transcoder of platforms) tested[transcoder].then(() => setProgress(`Running tests on ${platforms.length} platforms...`, (i++ / platforms.length) * 100))
    
                Promise.allSettled(Object.values(tested)).then((results) => {
                    let o = {};
    
                    results.map(o => o.value).filter(o => o).forEach(result => o[result.name] = result.works);
    
                    res(o);

                    if(fs.existsSync(destination)) fs.unlinkSync(destination);
                });
            });
        });
    }
}