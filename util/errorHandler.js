const sendNotification = require(`../core/sendNotification`)

module.exports = (err) => {
    console.error(err)

    const str = `${typeof err == `object` ? JSON.stringify(err, null, 4) : err}\n\n${typeof err == `object` && err.stack? err.stack : `(no stack)`}`

    const notifSent = global.testrun ? false : sendNotification({
        headingText: `Internal error occurred!`,
        bodyText: str,
        type: `error`
    });

    if(!notifSent) return require('./errorAndExit')(str)
}