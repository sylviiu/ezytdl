module.exports = {
    type: `handle`,
    func: (_e, path) => new Promise(async res => {
        const meta = await require(`../../../util/ytdlp`).ffprobeInfo(path);
        console.log(`meta done lol`)
        res(meta)
    })
}