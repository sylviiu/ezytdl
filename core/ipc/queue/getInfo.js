module.exports = {
    type: `handle`,
    func: (_e, url) => new Promise(async res => {
        if(require(`../../../util/fileExists`)(url)) {
            return res(null);
        } else {
            const meta = await require(`../../../util/ytdlp`).listFormats(url);
            console.log(`meta done lol`)
            res(meta)
        }
    })
}