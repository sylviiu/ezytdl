module.exports = {
    type: `handle`,
    func: (_e, url) => new Promise(async res => {
        if(require('fs').existsSync(typeof url == `object` ? url.query : url)) {
            require(`../../sendNotification`)({
                headingText: `File found`,
                bodyText: `Did you mean to download a file? If so, use the Convert tab at the top!`,
                redirect: `tab:Convert`,
                redirectMsg: `Go to Convert tab`
            })
        };

        const data = await require(`../../../util/ytdlp`).search(url);
        console.log(`search done lol`)
        res(data)
    })
}