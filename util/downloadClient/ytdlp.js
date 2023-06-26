const { file, downloadPath } = require(`../filenames/ytdlp`);
const fs = require('fs');
const Stream = require('stream');
const which = require(`which`);
const path = require(`path`);
const child_process = require(`child_process`);

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
        close: () => {
            activeDownload = null;
            obj = Object.assign(obj, {complete: true})
            global.window ? global.window.webContents.send(`updateClientEvent`, obj) : null;
            res()
        }
    }

    console.log(`downloadClient`);

    if(fs.existsSync(require(`../pythonBridge`).bridgepath)) {
        ws.send({ progress: 1, message: `Python bridge exists -- no need to download a client!` });
        ws.close()
    }

    const ghRequest = require(`../fetchLatestVersion/ytdlp`);

    const execFile = (...args) => new Promise(async r => {
        let updateFunc = () => {};

        if(typeof args[0] == `function`) updateFunc = args.shift();

        const proc = child_process.execFile(...args);

        const log = (prefix, d) => {
            const str = d.toString().trim();
            //console.log(prefix + d.split(`\n`).join(`\n${prefix}`));
            if(str.includes(`Collecting `)) {
                updateFunc(str.split(`Collecting `).slice(-1)[0].split(`\n`)[0])
            } else if(str.includes(`Installing collected packages: `)) {
                updateFunc(null, null, `Installing packages to pyenv...`, `"${str.split(`Installing collected packages: `).slice(-1)[0].split(`\n`)[0].split(`, `).join(`", "`)}"`)
            }
        }

        proc.stdout.on(`data`, d => log(`OUT | `, d))
        proc.stderr.on(`data`, d => log(`ERR | `, d))

        proc.on(`close`, r)
    })

    ghRequest().then(async r => {        
        const latest = r.response;
            
        const version = latest.tag_name;

        const downloads = latest.assets;
        
        ws.send({ version, progress: 0 })
        
        const currentVersion = (await require(`../currentVersion/ytdlp`)(true)).toString();

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

                    const chmod = (path) => {
                        console.log(`CHMOD ${path}`)

                        if(!process.platform.toLowerCase().includes(`win32`)) {
                            try {
                                require(`child_process`).execFileSync(`chmod`, [`+x`, path])
                            } catch(e) {
                                fs.chmodSync(path, 0o777)
                            }
                        }
        
                        ws.close();
                    }

                    if(downloadFile.endsWith(`.zip`)) {
                        fs.mkdirSync(downloadPath, { recursive: true, failOnError: false });

                        const extractor = require(`unzipper`).Extract({
                            path: downloadPath
                        });

                        fs.createReadStream(downloadPath + `.zip`).pipe(extractor);

                        extractor.on(`close`, () => {
                            fs.unlinkSync(downloadPath + `.zip`);
                            const newPath = require(`../filenames/ytdlp`).getPath()
                            chmod(newPath);
                        });
                    } else {
                        chmod(downloadPath)
                    }
                })
            }
        }
    })
})