const sendNotification = require(`../../sendNotification`);

global.changelogResponse = null;

module.exports = {
    type: `on`,
    func: async () => {
        console.log(`checking changelog`);
        global.sendNotifs = true;
        setTimeout(() => require(`../../sendNotification`)(), 50)
        if(!global.changelogResponse) await new Promise(async res => {
            global.changelogResponse = true;
            
            require(`../../../util/githubReleasesRequest`)(`sylviiu`, `ezytdl`).then(async r => {
                if(r && r.response) {
                    global.changelogResponse = r.response
                    
                    const lastVersionChecked = (await require(`../../../getConfig`)()).version;
                    const currentVersion = require(`../../../package.json`).version;
            
                    if(global.changelogResponse && lastVersionChecked !== currentVersion && currentVersion == global.changelogResponse.tag_name) {
                        sendNotification({
                            headingText: `ezytdl has been updated!`,
                            bodyText: `Click here to view the changelog.`,
                            redirect: `changelog.html`,
                        })
                        require(`../../../getConfig`)({ version: global.changelogResponse.tag_name });
                    }
                } else {
                    console.log(`no response still`)
                };

                res(false);
            })
        });
    }
}