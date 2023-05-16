let latest = null;

module.exports = () => {
    if(latest) {
        return Promise.resolve(latest)
    } else {
        latest = require(`../githubReleasesRequest`)(`yt-dlp`, `yt-dlp`);
        return latest;
    }
}