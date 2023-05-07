const { path } = require(`../util/ytdlpFileName`);

const child_process = require('child_process');

module.exports = {
    listFormats: (url) => new Promise(async res => {
        console.log(`going to path ${path}`)

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
        const { saveLocation } = require(`../getConfig`)()

        const proc = child_process.spawn(path, [`-f`, format, url, `-o`, `${saveLocation}/%(title)s.%(ext)s`, `--embed-thumbnail`, `--embed-metadata`]);

        let lastPercent = 0;

        proc.stdout.on(`data`, data => {
            const string = data.toString();
            const percent = string.includes(`%`) ? string.split(`%`)[0].split(` `).slice(-1)[0] : null;
            if(percent) {
                console.log(percent)
                const percentNum = Number(percent);
                if(percentNum > lastPercent) {
                    lastPercent = percentNum;
                    updateFunc({percentNum, saveLocation, url, format});
                }
            }
        });
        
        proc.on(`close`, code => {
            res({code, saveLocation, url, format})
        })
    })
}