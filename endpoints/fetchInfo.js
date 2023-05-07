const listFormats = require(`../util/ytdlp`).listFormats

module.exports = {
    type: `get`,
    path: `/fetchInfo/:url(*+)`,
    func: async (req, res) => {
        const link = req.params.url + Object.entries(req.query).map((q, index) => `${index === 0 ? `?` : `&`}${q[0]}=${q[1]}`).join(``);

        const meta = await listFormats(link);
        console.log(`meta done lol`)
        res.send(meta)
    }
}