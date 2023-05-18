module.exports = () => new Promise(async (res, rej) => {
    if(process.platform != `darwin`) {
        require(`../../util/downloadClient/ffmpeg`)().then((r) => {
            console.log(`FFMPEG INSTALLED.`);
            res(require(`../../util/filenames/ffmpeg`).getPath());
        }).catch(rej)
    } else {
        console.log(`PLATFORM IS MACOS; SKIPPING FFMPEG DOWNLOAD`);
        res(null);
    }
})