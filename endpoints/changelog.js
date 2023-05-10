module.exports = {
    type: `get`,
    path: `/changelog/:check`,
    func: async (req, res) => {
        if(req.params.check == `true`) {
            const lastVersionChecked = require(`../getConfig`)().version;
            const currentVersion = require(`../package.json`).version;
    
            if(lastVersionChecked !== currentVersion) {
                res.send(true);
            } else {
                res.send(false);
            }
        } else {
            const updated = require(`../getConfig`)({ version: require(`../package.json`).version });

            const { response } = await require(`../util/githubReleasesRequest`)(`sylviiu`, `ezytdl`);
            
            const obj = {
                url: response.html_url,
                version: response.tag_name,
                released: response.published_at,
                body: response.body
            }

            console.log(obj);

            res.send(obj)
        }
    }
}