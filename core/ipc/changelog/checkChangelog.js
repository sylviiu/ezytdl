const sendNotification = require(`../../sendNotification`);

global.changelogResponse = null;

module.exports = {
    type: `on`,
    func: async () => {
        console.log(`checking changelog`);
        global.sendNotifs = true;
        setTimeout(() => require(`../../sendNotification`)(), 50)
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

        const lastVersionChecked = require(`../../../getConfig`)().version;
        const currentVersion = require(`../../../package.json`).version;

        if(lastVersionChecked !== currentVersion && currentVersion == global.changelogResponse.tag_name) {
            const updated = require(`../../../getConfig`)({ version: global.changelogResponse.tag_name });
            sendNotification({
                headingText: `ezytdl has been updated!`,
                bodyText: `Click here to view the changelog.`,
                redirect: `changelog.html`,
            })
        }
    }
}