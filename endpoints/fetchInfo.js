const listFormats = require(`../util/ytdlp`).listFormats

module.exports = {
    type: `get`,
    path: `/fetchInfo/:url(*+)`,
    func: async (req, res) => {
        const meta = await listFormats(req.params.url);
        console.log(`meta done lol`)
        res.send(meta)
    }
}