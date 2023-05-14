const sendNotification = require(`../../sendNotification`);

global.changelogResponse = null;

module.exports = {
    type: `on`,
    func: () => new Promise(async res => {
        console.log(`checking changelog`)
        if(!global.changelogResponse) await new Promise(async res => {
            require(`../../../util/githubReleasesRequest`)(`sylviiu`, `ezytdl`).then(r => {
                if(r && r.response) {
                    global.changelogResponse = r.response
                } else {
                    console.log(`no response still`)
                };

                res(false);
            })
        });

        if(!global.changelogResponse) return res(null);

        const lastVersionChecked = require(`../../../getConfig`)().version;
        const currentVersion = require(`../../../package.json`).version;

        if(lastVersionChecked !== currentVersion && currentVersion == global.changelogResponse.tag_name) {
            res(true)
            const updated = require(`../../../getConfig`)({ version: global.changelogResponse.tag_name });
            sendNotification({
                headingText: `ezytdl has been updated!`,
                bodyText: `Click here to view the changelog.`,
                redirect: `changelog.html`,
            })
        } else res(false);
    })
}