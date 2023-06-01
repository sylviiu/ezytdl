module.exports = () => new Promise(async res => {
    try {
        const DBus = require(`dbus`);
        const bus = DBus.getBus(`session`);
        bus.getInterface(`org.freedesktop.portal.Desktop`, `/org/freedesktop/portal/desktop`, `org.freedesktop.portal.Settings`, (e, interface) => {
            if(e) {
                console.log(`Failed to get interface: ${e}`);
                res(false);
            } else {
                interface.getProperty(`org.freedesktop.appearance`, (e, value) => {
                    console.log(value);
                })
            }
        })
    } catch(e) {
        console.log(`Failed to get dbus: ${e}`);
        res(false);
    }
})