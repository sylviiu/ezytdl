module.exports = {
    type: `handle`,
    func: (_e, path) => new Promise(async res => {
        const meta = await require(`../../../util/ytdlp`).ffprobe(path);
        console.log(`meta done lol`)
        res(meta)
    })
}