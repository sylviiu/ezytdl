const { getPathPromise } = require(`./filenames/ffmpeg`)
const { spawn } = require('child_process');
const { app } = require(`electron`);
const { Stream } = require('stream');

const fs = require('fs');
const pfs = require('./promisifiedFS')

const findPath = require(`./getPath`);
const idGen = require(`./idGen`);
const ytdlp = require(`./ytdlp`)
const superagent = require(`superagent`);

const constructPromise = (name, accelArgs, file, codec) => new Promise(async (res) => {
    let pre = (accelArgs.pre || []).slice(0);
    let post = (accelArgs.post || []).slice(0);

    if(post.indexOf(`-c:v`) == -1) post.push(`-c:v`, codec);
    if(post.indexOf(`-f`) == -1) post.push(`-f`, `null`);
    
    if(post.indexOf(`-c:v`) != -1) post[post.indexOf(`-c:v`) + 1] = codec + `_${accelArgs.string}`;

    const args = [`-hide_banner`, `-loglevel`, `error`, ...pre, `-i`, file, `-threads`, `1`, ...post, `-`, `-benchmark`]

    console.log(`[FFMPEG/HW -- TESTING] ${name} with codec ${codec}: ${post[post.indexOf(`-c:v`) + 1]}`)

    const proc = spawn(await getPath(), args);

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

            writeStream.once(`finish`, async () => {
                setProgress(`Getting video codec...`, 50);

                const videoCodec = await ytdlp.getCodec(destination);

                if(!videoCodec) return rej(`Could not get video codec of "${destination}"`)

                setProgress(`Running tests on ${platforms.length} platforms...`, -1)

                const transcoders = await require(`./configs`).ffmpegGPUArgs();
    
                let tested = {};
    
                for(const transcoder of platforms) {
                    console.log(`[FFMPEG/HW -- USING] ${transcoder}`)

                    tested[transcoder] = constructPromise(transcoder, transcoders[transcoder], destination, videoCodec)
                };

                let i = 1;

                for(const transcoder of platforms) tested[transcoder].then(() => setProgress(`Running tests on ${platforms.length} platforms...`, (i++ / platforms.length) * 100))
    
                Promise.allSettled(Object.values(tested)).then(async (results) => {
                    let o = {};
    
                    results.map(o => o.value).filter(o => o).forEach(result => o[result.name] = result.works);
    
                    res({
                        codec: videoCodec,
                        results: o
                    });

                    if(await pfs.existsSync(destination)) pfs.unlinkSync(destination);
                });
            });
        });
    }
}