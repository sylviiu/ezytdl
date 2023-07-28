const parseLog = (prefix, func=`log`, ...data) => data.forEach(d => console[func](prefix, typeof d == `string` ? d.split(`\n`).join(`\n${prefix} `) : d));

const bringToFront = require(`./bringToFront`)

module.exports = ({ session, id }) => {
    const log = (...data) => parseLog(`[extension/${id}]`, `log`, ...data);
    const elog = (...data) => parseLog(`[extension/${id}]`, `error`, ...data);

    log(`[extension/${id}] creating message handler...`);

    return ({ type, data }) => {
        try {
            if(type == `listFormats`) {
                console.log(`[extension/${id} AUTHED] received listFormats request! (${data.query})`);

                data.headers = require(`../util/ytdlpUtil/headers`).filterHeaders(data.headers || {});

                console.log(`[extension/${id} AUTHED] sending data (${data.query})`, data);

                bringToFront();

                if(global.window && global.window.webContents) {
                    global.window.webContents.send(`system-listFormats`, Object.assign(data, { force: true }));
                    console.log(`[extension/${id} AUTHED] sent listFormats response! (${data.query})`);
                } else elog(`[extension/${id} AUTHED] failed to send listFormats response! (window not ready) (${data.query})`);
            } else elog(`[extension/${id} AUTHED] received (unknown) message! (type: ${type})`, data);
        } catch(e) {
            elog(`[extension/${id} AUTHED] failed to handle message!`, e);
        }
    }
}