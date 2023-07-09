module.exports = {
    type: `handle`,
    func: (_e, url) => new Promise(async res => {
        if(require(`../../../util/fileExists`)(url)) {
            return res(null);
        } else {
            const data = await require(`../../../util/ytdlp`).search(url);
            console.log(`search done lol`)
            res(data)
        }
    })
}