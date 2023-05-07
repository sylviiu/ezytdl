module.exports = () => new Promise(async (res, rej) => {
    const ghRequest = require(`superagent`).get(`https://api.github.com/repos/yt-dlp/yt-dlp/releases?page=1&per_page=1`).set(`User-Agent`, `node`);

    ghRequest.then(r => r.body).then(r => {
        return res({
            version: r[0].tag_name,
            assets: r[0].assets.map(d => {
                return {
                    name: d.name,
                    url: d.browser_download_url
                }
            }),
            response: r[0]
        })
    }).catch(rej)
})