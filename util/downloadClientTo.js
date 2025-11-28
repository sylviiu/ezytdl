const fs = require('fs');
const pfs = require('./promisifiedFS');
const Stream = require('stream');

module.exports = ({ws, version, str, url, size, downloadPath}) => new Promise(async (res, rej) => {
    try {
        ws.send({ progress: 0, version, message: `Downloading ${str ? str : `version ${version}`}` });
    
        const parsedPath = require(`path`).parse(downloadPath);
    
        const folder = parsedPath.dir;
        const file = parsedPath.base;
    
        console.log(`[downloadClientTo]: Downloading version str ${version} at "${url}" to ${downloadPath}\n- name: ${file}\n- in: ${folder}`);
    
        await pfs.mkdirSync(folder, { recursive: true });
    
        const writeStream = fs.createWriteStream(downloadPath, { flags: `w` });
        let totalData = 0;

        fetch(url, {
            headers: {
                "User-Agent": `node`,
                "Authorization": global.testrun && process.env["GITHUB_TOKEN"] || undefined
            }
        }).then(async r => {
            for await (const chunk of r.body) {
                const data = Buffer.from(chunk);
                const progress = (totalData += Buffer.byteLength(chunk)) / size;
                ws.send({ progress, version });
                writeStream.write(data);
            }

            writeStream.close();

            writeStream.once(`close`, () => {
                res();
            })
        });
    } catch(e) {
        console.error(e)
        rej(e);
    }
})