let lastRequest = null;

module.exports = (clear) => {
    if(clear) return lastRequest = null;

    if(lastRequest) return Promise.resolve(lastRequest);

    const req = require(`../githubReleasesRequest`)(`sylviiu`, `ytdlp-pybridge`);

    req.then(o => {
        if(o && typeof o == `object` && !o.error) lastRequest = o;
    });

    return req;
};