let response = null;

const { sendNotification } = require(`../util/downloadManager`);

module.exports = {
    type: `get`,
    path: `/changelog/:check`,
    func: async (req, res) => {
        if(!response) await new Promise(async res => {
            require(`../util/githubReleasesRequest`)(`sylviiu`, `ezytdl`).then(r => {
                if(r && r.response) {
                    response = r.response
                } else {
                    console.log(`no response still`)
                };

                res(false);
            })
        });

        if(req.params.check == `true`) {
            if(!response) return res.send(false)

            const lastVersionChecked = require(`../getConfig`)().version;
            const currentVersion = require(`../package.json`).version;

            /*if(!app.isPackaged) {
                console.log(`--\nVERSION CHECK DISABLED\nBuild: ${currentVersion}\nLast Checked: ${lastVersionChecked}\n--`)
            } else*/ if(lastVersionChecked !== currentVersion && currentVersion == response.tag_name) {
                res.send(false);
                const updated = require(`../getConfig`)({ version: response.tag_name });
                sendNotification({
                    headingText: `ezytdl has been updated!`,
                    bodyText: `Click here to view the changelog.`,
                    redirect: `changelog.html`,
                })
            } else {
                res.send(false);
            }
        } else {
            if(!response) return res.send({
                version: require(`../package.json`).version,
                released: Date.now(),
                body: `There was a problem fetching the changelog. Please try again later.`
            })
            
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