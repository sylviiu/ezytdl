const sendNotification = require("../../sendNotification.js");

let response = null;

module.exports = {
    type: `handle`,
    func: () => new Promise(res => {
        const v = require(`../../../package.json`).version;
        
        if(v.includes(`nightly`)) {
            res(`nightly` + v.split(`nightly`).slice(-1)[0])
        } else res(v)
    })
}