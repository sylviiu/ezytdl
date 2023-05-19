const fs = require('fs');
const Stream = require('stream');

const downloadPath = require(`path`).join(global.configPath, `client`);

const errorHandler = require(`../errorHandler`);
const { platform } = require('os');

let activeDownload = null;

module.exports = async () => {
    if(activeDownload) return activeDownload;

    activeDownload = true;

    const ws = {
        send: (args) => global.window ? global.window.webContents.send(`updateClientEvent`, args) : null,
        close: () => {
            activeDownload = null;
            global.window ? global.window.webContents.send(`updateClientEvent`, {complete: true}) : null
        }
    }

    console.log(`downloadClient`)

    const ghRequest = require(`../fetchLatestVersion/ezytdl`);

    ghRequest().then(async r => {        
        const latest = r.response;
            
        const version = latest.tag_name;

        const downloads = latest.assets;
        
        ws.send({ version, progress: 0 })
        
        const currentVersion = require(`../../package.json`).version;

        console.log(`Current version: ${currentVersion}`);

        if(currentVersion == version) {
            ws.send({ message: `You're already on the latest version!`, version, progress: 1 });
            ws.close()
        } else {
            ws.send({ progress: 0, version });
    
            console.log(`Latest version: ${version}`);
            console.log(`Downloads: ${downloads.map(d => d.name).join(`, `)}`);

            const file = downloads.find(d => d.name.startsWith(`ezytdl-${require('os').platform()}-${version}`) && !d.name.endsWith(`blockmap`));
    
            if(!file) {
                return errorHandler(`Failed to find download for ${require('os').platform()} in latest release; please make sure that you are using a supported a platform!\n\nIf you are, please open an issue on GitHub.`)
            } else {
                const download = file;
    
                console.log(`Found target file! (${file.name} / ${download.size} size); downloading ${download.name} from "${download.browser_download_url}"`);

                require('fs').mkdirSync(downloadPath, { recursive: true, failOnError: false });
    
                const writeStream = fs.createWriteStream(require(`path`).join(`${downloadPath}`, download.name), { flags: `w` });
    
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
    
                    ws.send({ progress, version });
    
                    //console.log(`Downloaded ` + Math.round(progress * 100) + `% ...`)
                })
    
                writeStream.on(`finish`, () => {
                    console.log(`done!`);

                    if(!platform().toLowerCase().includes(`win32`)) fs.chmodSync(require(`path`).join(`${downloadPath}`, download.name), 0o777);

                    require(`../../core/quit`)(true).then(async r => {
                        if(r) {
                            require(`electron`).app.releaseSingleInstanceLock();

                            global.quitting = true;

                            await require(`electron`).shell.openPath(require(`path`).join(`${downloadPath}`, download.name));

                            //require(`electron`).app.quit();

                            /*const proc = require(`child_process`).spawn(require(`path`).join(`${downloadPath}`, download.name), { detached: true });
                            proc.unref();

                            proc.once(`spawn`, () => {
                                proc.stderr.unpipe()
                                proc.stderr.destroy()
                                proc.stdout.unpipe()
                                proc.stdout.destroy()
                                proc.stdin.end()
                                proc.stdin.destroy()
    
                                require(`electron`).app.quit();
                            })*/
                        } else ws.close();
                    })
    
                    //ws.close();
                })
            }
        }
    })
}