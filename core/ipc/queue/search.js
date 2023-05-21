module.exports = {
    type: `handle`,
    func: (_e, url) => new Promise(async res => {
        const data = await require(`../../../util/ytdlp`).search(url);
        console.log(`search done lol`)
        res(data)
    })
}