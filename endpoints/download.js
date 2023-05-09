const { WebSocketServer } = require("ws")

module.exports = async (app, server) => {
    const wss = new WebSocketServer({ server, path: `/download` });

    wss.on(`connection`, async (ws) => {
        console.log(`New download request established!`);
        
        let timeout = setTimeout(() => {
            ws.close()
        }, 5000)

        ws.once(`message`, async (o) => {
            clearTimeout(timeout);

            if(o == `client`) {
                return require(`../util/downloadClientWS`)(ws)
            } else {
                console.log(`Downloading format`)

                const { url, format } = JSON.parse(o);

                console.log(`Downloading format ${format} from ${url}`);

                let killFunc = null;
                let killed = false;

                ws.once(`close`, () => {
                    if(!killFunc) {
                        killed = true
                    } else {
                        try {
                            killFunc();
                        } catch(e) {
                            console.error(e)
                        }
                    }
                })
    
                const ytdlpProc = require(`../util/ytdlp`).download(url, format, (update) => {
                    console.log(`${update.percentNum}% | ${update.destinationFile} | ${update.downloadSpeed} | ${update.eta}`);
                    if(update.killFunc) killFunc = update.killFunc;
                    ws.send(JSON.stringify(update));
                });
    
                ytdlpProc.then((update) => {
                    ws.send(JSON.stringify(update));
                    killFunc = null;
                    ws.close();
                })
            }
        })
    })
}