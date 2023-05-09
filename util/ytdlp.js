const { path } = require(`../util/ytdlpFileName`);

const child_process = require('child_process');

module.exports = {
    listFormats: (url) => new Promise(async res => {
        console.log(`going to path ${path}; url "${url}"`)

        const proc = child_process.spawn(path, [url, `--dump-single-json`]);

        let data = ``;

        proc.stderr.on(`data`, d => console.log(d.toString().trim()))

        proc.stdout.on(`data`, d => {
            //console.log(`output`, d.toString())
            data += d.toString().trim();
        });

        proc.on(`error`, e => {
            console.log(e)
        })

        proc.on(`close`, code => {
            console.log(`listFormats closed with code ${code}`)
            const d = JSON.parse(data);
            //console.log(d)
            res(d)
        })
    }),
    download: (url, format, updateFunc) => new Promise(async res => {
        const { saveLocation, outputFilename } = require(`../getConfig`)();

        const proc = child_process.spawn(path, [`-f`, format, url, `-o`, `${saveLocation}/` + outputFilename + `.%(ext)s`, `--embed-thumbnail`, `--embed-metadata`, `--no-mtime`]);

        proc.stdout.on(`data`, data => {
            const string = data.toString();
            const percent = string.includes(`%`) ? string.split(`%`)[0].split(` `).slice(-1)[0] : null;
            if(percent) {
                console.log(percent)
                updateFunc({percentNum: Number(percent), saveLocation, url, format});
            }
        });
        
        proc.on(`close`, code => {
            res({code, saveLocation, url, format})
        })
    })
}