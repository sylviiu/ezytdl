let latest = null;

module.exports = () => {
    if(latest) {
        return Promise.resolve(latest)
    } else {
        latest = require(`../githubReleasesRequest`)(`sylviiu`, `ezytdl`)
        latest.catch(e => {});
        return latest;
    }
}