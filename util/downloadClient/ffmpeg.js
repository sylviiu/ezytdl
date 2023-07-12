const { file, downloadPath, platform } = require(`../filenames/ffmpeg`);
const fs = require('fs');
const pfs = require('../promisifiedFS')
const Stream = require('stream');

const errorHandler = require(`../errorHandler`);

let activeDownload = null;

let lastRoundedNum = 0;

module.exports = async () => new Promise(async res => {
    if(activeDownload) return activeDownload;

    activeDownload = true;

    const ws = {
        send: (args) => {
            global.window ? global.window.webContents.send(`updateClientEvent`, args) : null
            if(global.testrun) {
                const newNum = Math.round(args.progress * 100);
                if(newNum != lastRoundedNum) {
                    lastRoundedNum = newNum;
                    console.log(`Downloaded ` + Math.round(args.progress * 100) + `% ...`)
                }
            }
        },
        close: (noMessage) => {
            const obj = {complete: true};
            if(!noMessage) obj.message = `Complete!`;
            global.window ? global.window.webContents.send(`updateClientEvent`, obj) : null;
            activeDownload = null;
            res()
        }
    }

    console.log(`downloadClient`)
        
    ws.send({ progress: -1, message: `Checking for updates...` })

    const ghRequest = require(`../fetchLatestVersion/ffmpeg`);

    ghRequest().then(async r => {   
        if(!r || r.error) {
            ws.send({progress: -1, message: `Failed to check for updates! (${r && r.error ? r.error : `(no response)`})`})
            return ws.close(true);
        }
        
        const latest = r.response;
            
        const version = latest.name.includes(`(`) ? latest.name.split(`(`)[1].split(` `)[0].replace(/-/g, ``) : latest.name;

        const downloads = latest.assets;
        
        ws.send({ version, progress: 0 })
        
        const currentVersion = (await require(`../currentVersion/ffmpeg`)(true, true));

        console.log(`Current version: ${currentVersion}`)

        if(currentVersion == version) {
            ws.send({ message: `You're already on the latest version!`, version, progress: 1 });
            ws.close(true)
        } else {
            ws.send({ progress: 0, version })
    
            console.log(`Latest version: ${version}`);
            console.log(`Downloads: ${downloads.map(d => d.name).join(`, `)}`);

            if(process.platform == `darwin`) {
                const downloadFFmpeg = downloads.find(d => d.name == `ffmpeg-darwin-${process.arch}`);
                const downloadFFprobe = downloads.find(d => d.name == `ffprobe-darwin-${process.arch}`);

                if(!downloadFFmpeg || !downloadFFprobe) {
                    return errorHandler(`Failed to find download for ${file} in latest release; please make sure that you are using a supported a platform!\n\nIf you are, please open an issue on GitHub.`)
                } else {
                    console.log(`Found target FFmpeg: ${downloadFFmpeg.name} / ${downloadFFmpeg.size} size; downloading from "${downloadFFmpeg.browser_download_url}"`);
                    console.log(`Found target FFprobe: ${downloadFFprobe.name} / ${downloadFFprobe.size} size; downloading from "${downloadFFprobe.browser_download_url}"`);
    
                    require(`../currentVersion/ffmpeg`)(null, null, true);

                    if(await pfs.existsSync(downloadPath)) await pfs.rmdirSync(downloadPath, { recursive: true });

                    const mainPath = require(`path`).join(downloadPath, `pretend-this-is-a-good-name`);

                    await pfs.mkdirSync(mainPath, { recursive: true, failOnError: false });

                    const ffmpegPath = require(`path`).join(mainPath, `bin`, `ffmpeg`);
                    const ffprobePath = require(`path`).join(mainPath, `bin`, `ffprobe`);

                    try {
                        const ffmpeg = await require(`../downloadClientTo`)({
                            ws,
                            version,
                            str: `FFmpeg (${version})`,
                            url: downloadFFmpeg.browser_download_url,
                            size: downloadFFmpeg.size,
                            downloadPath: ffmpegPath
                        });

                        const ffprobe = await require(`../downloadClientTo`)({
                            ws,
                            version,
                            str: `FFprobe (${version})`,
                            url: downloadFFprobe.browser_download_url,
                            size: downloadFFprobe.size,
                            downloadPath: ffprobePath
                        });

                        console.log(`CHMOD ${ffmpegPath} & ${ffprobePath}`);
                        
                        try {
                            require(`child_process`).execFileSync(`chmod`, [`+x`, ffmpegPath])
                        } catch(e) {
                            await pfs.chmodSync(ffmpegPath, 0o777)
                        };
                        
                        try {
                            require(`child_process`).execFileSync(`chmod`, [`+x`, ffprobePath])
                        } catch(e) {
                            await pfs.chmodSync(ffprobePath, 0o777)
                        };

                        ws.close();
                    } catch(e) {
                        console.error(e);
                        return errorHandler(`Failed to download FFmpeg / FFprobe! (${e})`)
                    }
                }
            } else {
                const download = downloads.find(d => d.name.startsWith(`ffmpeg-master-latest-${file}-gpl-shared`)) || downloads.find(d => d.name.startsWith(`ffmpeg-master-latest-${file}`));
        
                if(!download) {
                    return errorHandler(`Failed to find download for ${file} in latest release; please make sure that you are using a supported a platform!\n\nIf you are, please open an issue on GitHub.`)
                } else {
                    console.log(`Found target file! (${file} / ${download.size} size); downloading ${download.name} from "${download.browser_download_url}"`);
    
                    require(`../currentVersion/ffmpeg`)(null, null, true);
    
                    let ext = `.zip`;
    
                    if(platform == `linux`) ext = `.tar.xz`;
    
                    if(await pfs.existsSync(downloadPath)) await pfs.rmdirSync(downloadPath, { recursive: true });
    
                    require(`../downloadClientTo`)({
                        ws,
                        version,
                        url: download.browser_download_url,
                        size: download.size,
                        downloadPath: downloadPath + ext
                    }).then(async () => {
                        const finalize = async () => {
                            console.log(`Extracted!`);
            
                            await pfs.unlinkSync(downloadPath + ext);
            
                            const newPath = require(`../filenames/ffmpeg`).getPath()
            
                            if(!process.platform.toLowerCase().includes(`win32`)) {
                                console.log(`CHMOD ${newPath}`);
                                
                                try {
                                    require(`child_process`).execFileSync(`chmod`, [`+x`, newPath])
                                } catch(e) {
                                    await pfs.chmodSync(newPath, 0o777)
                                }
                            }
            
                            console.log(newPath);
            
                            ws.close();
                        };
            
                        console.log(`done!`);
            
                        await pfs.mkdirSync(downloadPath, { recursive: true, failOnError: false });
            
                        if(platform == `linux`) {
                            require(`child_process`).execFileSync(`tar`, [`-xf`, downloadPath + ext, `-C`, downloadPath]);
                            finalize();
                        } else if(platform == `win`) {
                            const extractor = require(`unzipper`).Extract({
                                path: downloadPath
                            });
            
                            fs.createReadStream(downloadPath + ext).pipe(extractor);
            
                            extractor.on(`close`, () => finalize())
                        };
                    });
                }
            }
        }
    })
})