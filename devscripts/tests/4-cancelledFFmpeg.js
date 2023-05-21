global.tests = {};

module.exports = () => new Promise(async (res, rej) => {
    const info = global.tests[`getInfo`];

    let killFunc = null;

    let killed = false;

    let logsAfterKill = 0;

    require(`../../util/ytdlp`).download({
        url: process.env[`TEST-LINK`],
        format: `bv*+ba/b`,
        ext: `mp4`,
        filePath: null,
        info,
    }, (obj) => {
        if(obj.overall) obj = obj.overall;
        if(obj.latest) obj = obj.latest;

        console.log(obj && obj.status ? obj.status : obj)

        if(obj && obj.status && obj.status.toLowerCase().includes(`convert`)) {
            if(obj.kill) killFunc = obj.kill;
    
            if(killed) {
                logsAfterKill++;
            } else if(obj.percentNum > 0 && !killed) killFunc();
        }
    }).then(() => {
        if(logsAfterKill > 2) {
            rej(new Error(`Too many updates after kill (${logsAfterKill}) -- that's a fail.`))
        } else res({
            logsAfterKill,
            url: process.env[`TEST-LINK`],
        })
    }).catch(rej)
})