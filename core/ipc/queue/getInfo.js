module.exports = {
    type: `handle`,
    func: (_e, url) => new Promise(async res => {
        const meta = await require(`../../../util/ytdlp`).listFormats(url);
        console.log(`meta done lol`)
        res(meta)
    })
}