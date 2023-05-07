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

                console.log(`Downloading format ${format} from ${url}`)
    
                const ytdlpProc = require(`../util/ytdlp`).download(url, format, ({ percentNum, saveLocation, url, format }) => {
                    console.log(percentNum, saveLocation, url, format)
                    ws.send(JSON.stringify({ percentNum, saveLocation, url, format }));
                });
    
                ytdlpProc.then(({ code, saveLocation, url, format }) => {
                    ws.send(JSON.stringify({ code, saveLocation, url, format, percentNum: 100 }));
                    ws.close();
                })
            }
        })
    })
}