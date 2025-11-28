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
        close: (noMessage) => {
            activeDownload = null;
            const obj = {complete: true};
            if(!noMessage) obj.message = `Complete!`;
            global.window ? global.window.webContents.send(`updateClientEvent`, obj) : null
        }
    }

    console.log(`downloadClient`)

    const ghRequest = require(`../fetchLatestVersion/ezytdl`);

    ghRequest().then(async r => {  
        if(!r || r.error) {
            ws.send({progress: -1, message: `Failed to check for updates! (${r && r.error ? r.error : `(no response)`})`})
            return ws.close(true);
        }
        
        const latest = r.response;
            
        const version = latest.tag_name;

        const downloads = latest.assets;
        
        ws.send({ version, progress: 0 })
        
        const currentVersion = require(`../../package.json`).version;

        console.log(`Current version: ${currentVersion}`);

        if(currentVersion == version) {
            ws.send({ message: `You're already on the latest version!`, version, progress: 1 });
            ws.close(true)
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
                let totalData = 0;

                fetch(download.browser_download_url, {
                    headers: {
                        "User-Agent": "node",
                        "Authorization": global.testrun && process.env["GITHUB_TOKEN"] || undefined
                    }
                }).then(r => {
                    if(r.status == 200) {
                        for await (const chunk of r.body) {
                            const data = Buffer.from(chunk);
                            const progress = (totalData += Buffer.byteLength(chunk)) / size;
                            ws.send({ progress, version });
                            writeStream.write(data);
                        }

                        writeStream.close();

                        console.log(`done!`);

                        if(!platform().toLowerCase().includes(`win32`)) fs.chmodSync(require(`path`).join(`${downloadPath}`, download.name), 0o777);

                        require(`../../core/quit`)(true).then(async r => {
                            if(r) {
                                require(`electron`).app.releaseSingleInstanceLock();

                                global.quitting = true;

                                await require(`electron`).shell.openPath(require(`path`).join(`${downloadPath}`, download.name));
                            } else ws.close();
                        })
                    }
                });
            }
        }
    })
}