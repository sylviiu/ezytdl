const superagent = require('superagent')

const errorAndExit = require('./errorAndExit');

const sendNotification = require(`../core/sendNotification`)

module.exports = (err) => {
    console.error(err)

    const str = `${err}\n\n${typeof err == `object` && err.stack? err.stack : `(no stack)`}`

    const notifSent = sendNotification({
        headingText: `Internal error occurred!`,
        bodyText: str,
        type: `error`
    });

    if(!notifSent) {
        return errorAndExit(str)
    
        if(`${err}`.includes(`EADDRINUSE`) && `${err}`.includes(`::3000`)) {
            superagent.get(`http://localhost:3000/focus`).then(() => {
                console.log(`Focused existing window, exiting...`);
                app.quit()
            })
        } else errorAndExit(str)
    }
}