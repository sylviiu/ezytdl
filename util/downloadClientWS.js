const { file } = require(`./filenames/ytdlp`);
const fs = require('fs');
const superagent = require('superagent');
const Stream = require('stream');

module.exports = async (ws) => {
    console.log(`downloadClient`)

    const ghRequest = require(`../util/getLatestVersion`);

    ghRequest().then(async r => {        
        const latest = r.response;
            
        const version = latest.tag_name;

        const downloads = latest.assets;
        
        ws.send(JSON.stringify({ version, progress: 0 }))
        
        const currentVersion = await require(`../util/currentDownloadedVersion`)(true);

        if(currentVersion == version) {
            ws.send(JSON.stringify({ message: `You're already on the latest version!`, version, progress: 1 }));
            ws.close()
        } else {
            ws.send(JSON.stringify({ progress: 0, version }))
    
            console.log(`Latest version: ${version}`);
            console.log(`Downloads: ${downloads.map(d => d.name).join(`, `)}`);
    
            if(!downloads.find(d => d.name === file)) {
                return errorAndExit(`Failed to find download for ${file} in latest release; please make sure that you are using a supported a platform!\n\nIf you are, please open an issue on GitHub.`)
            } else {
                const download = downloads.find(d => d.name === file);
    
                console.log(`Found target file! (${file} / ${download.size} size); downloading ${download.name} from "${download.browser_download_url}"`);
    
                const writeStream = fs.createWriteStream(`${global.configPath}/${file}`, { flags: `w` });
    
                const req = superagent.get(download.browser_download_url).set(`User-Agent`, `node`);
    
                const pt = new Stream.PassThrough();
    
                req.pipe(pt);
                pt.pipe(writeStream);
    
                let totalData = 0;
    
                pt.on(`data`, d => {
                    const progress = totalData += Buffer.byteLength(d) / download.size;
    
                    ws.send(JSON.stringify({ progress, version }));
    
                    console.log(`Downloaded ` + Math.round(progress * 100) + `% ...`)
                })
    
                writeStream.on(`finish`, () => {
                    console.log(`done!`);
    
                    ws.close();
                })
            }
        }
    })
}