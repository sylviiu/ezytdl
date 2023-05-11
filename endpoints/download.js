const { WebSocketServer } = require("ws");

const idGen = require(`../util/idGen`);

const { createDownload, setWS, queueAction } = require(`../util/downloadManager`)

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
                const args = JSON.parse(o);

                console.log(`Downloading format ${args.format} from ${args.url}`);

                let killFunc = null;
    
                const ytdlpProc = createDownload(args, (update) => {
                    if(update.killFunc) killFunc = update.killFunc;
                    ws.send(JSON.stringify(update));
                });
    
                ytdlpProc.then((update) => {
                    //console.log(update)
                    ws.send(JSON.stringify(update));
                    killFunc = null;
                    ws.close();
                })
            } catch(e) {
                console.log(`Not JSON. falling back to client downloading`, o);

                if(o == `queue`) {
                    setWS(ws);

                    ws.on(`message`, (m) => {
                        m = JSON.parse(m.toString());

                        if(m.action == `download`) {
                            createDownload(m.data, () => {}).then(() => {}).catch(() => {})
                        } else if(m.action) queueAction(m.id, m.action);
                    })
                } else if(o == `ytdlp`) {
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