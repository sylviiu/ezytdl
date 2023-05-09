const { WebSocketServer } = require("ws")

module.exports = async (app, server) => {
    const wss = new WebSocketServer({ server, path: `/download` });

    wss.on(`connection`, async (ws) => {
        console.log(`New download request established!`);
        
        let timeout = setTimeout(() => {
            ws.close()
        }, 5000)

        ws.once(`message`, async (o) => {
            o = o.toString();

            clearTimeout(timeout);

            try {
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
            } catch(e) {
                console.log(`Not JSON. falling back to client downloading`, o);
                
                if(o == `ytdlp`) {
                    return require(`../util/downloadClient/ytdlp`)(ws)
                } else if(o == `ffmpeg`) {
                    return require(`../util/downloadClient/ffmpeg`)(ws)
                } else {
                    ws.send(JSON.stringify({ message: `Unknown client`, version: `--`, progress: 0 }));
                    ws.close();
                }
            }
        })
    })
}