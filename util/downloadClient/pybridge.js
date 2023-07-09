const { file, path } = require(`../filenames/pybridge`);
const fs = require('fs');
const pfs = require('../promisifiedFS')
const Stream = require('stream');

const errorHandler = require(`../errorHandler`);

let activeDownload = null;

let lastRoundedNum = 0;

module.exports = async () => new Promise(async res => {
    if(activeDownload) return activeDownload;

    activeDownload = true;

    let obj = {};

    const ws = {
        send: (args) => {
            obj = Object.assign(obj, args)
            global.window ? global.window.webContents.send(`updateClientEvent`, obj) : null
            if(global.testrun) {
                const newNum = Math.round(args.progress * 100);
                if(newNum != lastRoundedNum) {
                    lastRoundedNum = newNum;
                    console.log(`Downloaded ` + Math.round(args.progress * 100) + `% ...`)
                }
            }
        },
        close: (noMessage) => {
            activeDownload = null;
            global.init.ytdlpDownloaded = true;
            obj = Object.assign(obj, {complete: true})
            if(!noMessage) obj.message = `Complete!`;
            global.window ? global.window.webContents.send(`updateClientEvent`, obj) : null;
            res()
        }
    }

    console.log(`downloadClient`);
        
    ws.send({ progress: -1, message: `Checking for updates...` })

    const ghRequest = require(`../fetchLatestVersion/pybridge`);

    ghRequest().then(async r => {     
        if(!r || r.error) {
            ws.send({progress: -1, message: `Failed to check for updates! (${r && r.error ? r.error : `(no response)`})`})
            return ws.close(true);
        }
        
        const latest = r.response;
            
        const version = latest.tag_name;
        
        const versionStr = `build ${version}`

        const downloads = latest.assets;
        
        const currentVersion = (await require(`../currentVersion/pybridge`)(true)).toString();

        console.log(`Current version: ${currentVersion}`)

        if(currentVersion == version) {
            ws.send({ message: `You're already on the latest version!`, version: versionStr });
            ws.close(true)
        } else {
            const pythonBridge = require(`../pythonBridge`);

            pythonBridge.resuscitate = false;

            if(pythonBridge.bridgeProc) try {
                pythonBridge.bridgeProc.kill();
                pythonBridge.bridgeProc = null;
            } catch(e) {}

            pythonBridge.resuscitate = false;

            ws.send({ progress: 0, version: versionStr })
    
            console.log(`Latest version: ${version}`);
            console.log(`Downloads: ${downloads.map(d => d.name).join(`, `)}`);
    
            if(!downloads.find(d => d.name === file)) {
                return errorHandler(`Failed to find download for ${file} in latest release; please make sure that you are using a supported a platform!\n\nIf you are, please open an issue on GitHub.`)
            } else {
                const download = downloads.find(d => d.name === file);
    
                console.log(`Found target file! (${file} / ${download.size} size); downloading ${download.name} from "${download.browser_download_url}"`);

                require(`../currentVersion/pybridge`)(null, null, true);

                let busy = 1;

                while(busy) await new Promise(async r => {
                    require('fs').open(path, 'w', (err, fd) => {
                        if(err && err.code == `EBUSY`) {
                            ws.send({ progress: -1, version: versionStr, message: `File locked... (attempt ${busy})` });
                            busy++;
                            if(fd) require('fs').close(fd)
                            setTimeout(() => r(), 1000);
                        } else {
                            console.log(`bridge process not busy`)
                            busy = false;
                            if(fd) require('fs').close(fd)
                            r();
                        }
                    });
                });
    
                const writeStream = fs.createWriteStream(path, { flags: `w` });
    
                const req = require('superagent').get(download.browser_download_url).set(`User-Agent`, `node`);

                if(process.env["GITHUB_TOKEN"] && global.testrun) {
                    console.log(`[TESTRUN] GITHUB_TOKEN found in environment! Authorizing this release request`)
                    req.set(`Authorization`, process.env["GITHUB_TOKEN"])
                }
    
                const pt = new Stream.PassThrough();
    
                req.pipe(pt);
                pt.pipe(writeStream);
    
                let totalData = 0;
    
                pt.on(`data`, d => {
                    const progress = totalData += Buffer.byteLength(d) / download.size;
    
                    ws.send({ progress, version: versionStr, message: `Downloading...` });
                })
    
                writeStream.on(`finish`, async () => {
                    console.log(`done!`);

                    console.log(`CHMOD ${path}`)

                    if(!process.platform.toLowerCase().includes(`win32`)) {
                        try {
                            require(`child_process`).execFileSync(`chmod`, [`+x`, path])
                        } catch(e) {
                            await pfs.chmodSync(path, 0o777)
                        }
                    };
                    
                    ws.send({ progress: 1, version: versionStr });

                    ws.close()
                })
            }
        }
    })
})