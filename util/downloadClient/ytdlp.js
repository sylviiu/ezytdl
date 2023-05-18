const { file, downloadPath } = require(`../filenames/ytdlp`);
const fs = require('fs');
const Stream = require('stream');

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

    const ghRequest = require(`../fetchLatestVersion/ytdlp`);

    ghRequest().then(async r => {        
        const latest = r.response;
            
        const version = latest.tag_name;

        const downloads = latest.assets;
        
        ws.send({ version, progress: 0 })
        
        const currentVersion = await require(`../currentVersion/ytdlp`)(true);

        console.log(`Current version: ${currentVersion}`)

        if(currentVersion == version) {
            ws.send({ message: `You're already on the latest version!`, version, progress: 1 });
            ws.close()
        } else {
            ws.send({ progress: 0, version })
    
            console.log(`Latest version: ${version}`);
            console.log(`Downloads: ${downloads.map(d => d.name).join(`, `)}`);

            let downloadFile = file.replace(`.exe`, `_win`) + `.zip`;

            //if(!downloads.find(d => d.name === downloadFile)) downloadFile = file;
    
            if(!downloads.find(d => d.name === downloadFile)) {
                return errorHandler(`Failed to find download for ${downloadFile} in latest release; please make sure that you are using a supported a platform!\n\nIf you are, please open an issue on GitHub.`)
            } else {
                const download = downloads.find(d => d.name === downloadFile);
    
                console.log(`Found target file! (${file} / ${download.size} size); downloading ${download.name} from "${download.browser_download_url}"`);
    
                const writeStream = fs.createWriteStream(`${downloadPath}` + `.zip`, { flags: `w` });
    
                const req = require('superagent').get(download.browser_download_url).set(`User-Agent`, `node`);
    
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

                    if(downloadFile.endsWith(`.zip`)) {
                        fs.mkdirSync(downloadPath, { recursive: true, failOnError: false });

                        const extractor = require(`unzipper`).Extract({
                            path: downloadPath
                        });

                        fs.createReadStream(downloadPath + `.zip`).pipe(extractor);

                        extractor.on(`close`, () => ws.close());
                    } else {
                        if(!platform().toLowerCase().includes(`win32`)) {
                            try {
                                require(`child_process`).execFileSync(`chmod`, [`+x`, downloadPath])
                            } catch(e) {
                                fs.chmodSync(downloadPath, 0o777)
                            }
                        }
        
                        ws.close();
                    }
                })
            }
        }
    })
}