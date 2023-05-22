module.exports = {
    type: `handle`,
    func: () => new Promise(res => {
        const pkg = require(`../../../package.json`);

        const time = require(`../../../util/time.js`);

        let str = [];
        
        if(pkg.version.includes(`nightly`)) {
            if(pkg.buildDate) {
                str.push(`nightly.` + pkg.version.split(`nightly.`).slice(-1)[0], `built ${time(Date.now() - pkg.buildDate, true).string} ago`);
            } else str.push(`nightly build`, `commit ` + pkg.version.split(`nightly.`).slice(-1)[0]);
        } else {
            str.push(pkg.version);
        }

        res(str.join(`<br>`))
    })
}