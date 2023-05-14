const sendNotification = require("../../sendNotification.js");

module.exports = {
    type: `handle`,
    func: () => {
        console.log(`getting changelog`)
        if(!global.changelogResponse) return {
            version: require(`../../../package.json`).version,
            released: Date.now(),
            body: `There was a problem fetching the changelog. Please try again later.`
        }
        
        const obj = {
            url: global.changelogResponse.html_url,
            version: global.changelogResponse.tag_name,
            released: global.changelogResponse.published_at,
            body: global.changelogResponse.body
        }

        console.log(obj);

        return obj;
    }
}