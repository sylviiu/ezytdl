module.exports = {
    type: `handle`,
    func: () => {
        if(!global.init.ytdlpDownloaded && !global.testrun) return `Installing`
        else return false;
    }
}