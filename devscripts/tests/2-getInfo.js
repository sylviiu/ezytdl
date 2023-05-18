global.tests = {};

process.env[`TEST-LINK`] = `https://www.youtube.com/watch?v=kG7d_4LeP48`

module.exports = () => new Promise(async res => {
    //const getInfo = require(`../../core/ipc/queue/getInfo`).func(null, process.env[`TEST-LINK`])
    const getInfo = require(`../../util/ytdlp`).listFormats(process.env[`TEST-LINK`])

    const info = await getInfo;

    console.log(info.title, info.webpage_url)

    global.tests[`getInfo`] = info;

    res({
        title: info.title,
        url: info.url || info.webpage_url,
        formatsLength: info.formats ? info.formats.length : -1,
        entriesLength: info.entries ? info.entries.length : -1,
    });
})