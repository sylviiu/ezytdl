const fs = require('fs');

module.exports = (path) => new Promise(async (res, rej) => {
    fs.stat(path, (err, stat) => {
        if(err) {
            res(false)
        } else {
            res(true)
        }
    })
})