const fs = require('fs');
const pfs = require('./promisifiedFS');
const Stream = require('stream');

module.exports = ({ws, version, url, size, downloadPath}) => new Promise(async (res, rej) => {
    try {
        ws.send({ progress: 0, version });
    
        const parsedPath = require(`path`).parse(downloadPath);
    
        const folder = parsedPath.dir;
        const file = parsedPath.base;
    
        console.log(`[downloadClientTo]: Downloading version str ${version} at "${url}" to ${downloadPath}\n- name: ${file}\n- in: ${folder}`);
    
        await pfs.mkdirSync(folder, { recursive: true });
    
        const writeStream = fs.createWriteStream(downloadPath, { flags: `w` });
    
        const req = require('superagent').get(url).set(`User-Agent`, `node`);
    
        if(process.env["GITHUB_TOKEN"] && global.testrun) {
            console.log(`[TESTRUN] GITHUB_TOKEN found in environment! Authorizing this release request`)
            req.set(`Authorization`, process.env["GITHUB_TOKEN"])
        }
        
        const pt = new Stream.PassThrough();
        
        let totalData = 0;
    
        pt.on(`data`, d => {
            const progress = totalData += Buffer.byteLength(d) / size;
            ws.send({ progress, version });
        })
    
        writeStream.on(`finish`, () => res());
    
        pt.pipe(writeStream);
        req.pipe(pt);
    } catch(e) {
        console.error(e)
        rej(e);
    }
})