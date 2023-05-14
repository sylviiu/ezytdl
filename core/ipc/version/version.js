const sendNotification = require("../../sendNotification.js");

let response = null;

module.exports = {
    type: `handle`,
    func: () => new Promise(res => res(require(`../../../package.json`).version))
}