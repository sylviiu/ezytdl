const superagent = require('superagent')

module.exports = (err) => {
    if(`${err.toString().includes(`EADDRINUSE`)}`) {
        console.log(`${err}`)
        superagent.get(`http://localhost:3000/focus`).then(() => {
            console.log(`Focused existing window, exiting...`);
            app.quit()
        })
    } else errorAndExit(`${err}\n\n${err.stack? err.stack : `(no stack)`}`)
}