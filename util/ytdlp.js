const { path } = require(`./filenames/ytdlp`);

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

        let destinationFile = saveLocation;

        const proc = child_process.spawn(path, [`-f`, format, url, `-o`, `${saveLocation}/` + outputFilename + `.%(ext)s`, `--embed-thumbnail`, `--embed-metadata`, `--no-mtime`]);

        proc.stdout.on(`data`, data => {
            const string = data.toString();

            console.log(string.trim());

            if(string.includes(`Destination:`)) destinationFile = string.split(`Destination:`)[1].trim();

            const percent = string.includes(`%`) ? string.split(`%`)[0].split(` `).slice(-1)[0] : null;
            if(percent) {
                const downloadSpeed = string.includes(`/s`) ? string.split(`/s`)[0].split(` `).slice(-1)[0] + `/s` : `-1B/s`;
                const eta = string.includes(`ETA`) ? string.split(`ETA`)[1].split(` `).slice(1).join(` `) : `00:00`;
                console.log(percent)
                updateFunc({percentNum: Number(percent), saveLocation, destinationFile, downloadSpeed, eta, url, format, kill: () => proc.kill()});
            }
        });

        proc.stderr.on(`data`, data => {
            const string = data.toString();

            console.log(string.trim())
        })
        
        proc.on(`close`, code => {
            res({code, saveLocation, destinationFile, url, format})
        })
    })
}