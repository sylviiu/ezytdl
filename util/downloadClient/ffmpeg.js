const { file, downloadPath, platform } = require(`../filenames/ffmpeg`);
const fs = require('fs');
const superagent = require('superagent');
const Stream = require('stream');

const errorHandler = require(`../errorHandler`);

module.exports = async (ws) => {
    console.log(`downloadClient`)

    const ghRequest = require(`../fetchLatestVersion/ffmpeg`);

    ghRequest().then(async r => {        
        const latest = r.response;
            
        const version = latest.tag_name.replace(`b`, ``);

        const downloads = latest.assets;
        
        ws.send(JSON.stringify({ version, progress: 0 }))
        
        const currentVersion = await require(`../currentVersion/ffmpeg`)(true);

        console.log(`Current version: ${currentVersion}`)

        if(currentVersion == version) {
            ws.send(JSON.stringify({ message: `You're already on the latest version!`, version, progress: 1 }));
            ws.close()
        } else {
            ws.send(JSON.stringify({ progress: 0, version }))
    
            console.log(`Latest version: ${version}`);
            console.log(`Downloads: ${downloads.map(d => d.name).join(`, `)}`);
    
            if(!downloads.find(d => d.name.startsWith(`ffmpeg-master-latest-${file}`))) {
                return errorHandler(`Failed to find download for ${file} in latest release; please make sure that you are using a supported a platform!\n\nIf you are, please open an issue on GitHub.`)
            } else {
                const download = downloads.find(d => d.name.startsWith(`ffmpeg-master-latest-${file}`));
    
                console.log(`Found target file! (${file} / ${download.size} size); downloading ${download.name} from "${download.browser_download_url}"`);

                let ext = `.zip`;

                if(platform == `linux`) ext = `.tar.xz`;

                if(fs.existsSync(downloadPath)) fs.rmdirSync(downloadPath, { recursive: true });
    
                const writeStream = fs.createWriteStream(downloadPath + ext, { flags: `w` });
    
                const req = superagent.get(download.browser_download_url).set(`User-Agent`, `node`);
    
                const pt = new Stream.PassThrough();
    
                req.pipe(pt);
                pt.pipe(writeStream);
    
                let totalData = 0;
    
                pt.on(`data`, d => {
                    const progress = totalData += Buffer.byteLength(d) / download.size;
    
                    ws.send(JSON.stringify({ progress, version }));
    
                    //console.log(`Downloaded ` + Math.round(progress * 100) + `% ...`)
                })
    
                writeStream.on(`finish`, () => {
                    const finalize = () => {
                        console.log(`Extracted!`);

                        fs.unlinkSync(downloadPath + ext);

                        const newPath = require(`../filenames/ffmpeg`).getPath()

                        if(!platform.toLowerCase().startsWith(`win`)) fs.chmodSync(newPath, 0o777)

                        console.log(newPath);

                        ws.close();
                    };

                    console.log(`done!`);

                    fs.mkdirSync(downloadPath, { recursive: true, failOnError: false });

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
    
                    //ws.close();
                })
            }
        }
    })
}