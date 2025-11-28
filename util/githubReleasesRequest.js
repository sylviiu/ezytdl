module.exports = (creator, repo) => new Promise(async (res, rej) => {
    fetch(`https://api.github.com/repos/${creator}/${repo}/releases?page=1&per_page=1`, { headers: { "User-Agent": "node", "Authorization": global.testrun && process.env["GITHUB_TOKEN"] || undefined } }).then(async response => {
        if(response.status == 200) {
            const r = await response.json();
            return res({
                version: r[0].tag_name,
                assets: r[0].assets.map(d => {
                    return {
                        name: d.name,
                        url: d.browser_download_url
                    }
                }),
                url: r[0].html_url,
                response: r[0]
            })
        } else {
            console.error(`GH request code ${response.status}`);
            res({error: `GitHub response was not 200 (${response.status})`});
        }
    }).catch(e => {
        console.error(`GH request: ${e} @ ${e.stack}`);
        res({error: e.message || e});
    })
})