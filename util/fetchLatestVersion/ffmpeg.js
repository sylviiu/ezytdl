let lastRequest = null;

module.exports = (clear) => {
    if(clear) return lastRequest = null;

    if(lastRequest) return Promise.resolve(lastRequest);

    let repo = process.platform == `win32` ? [`BtbN`, `FFmpeg-Builds`] : [`eugeneware`, `ffmpeg-static`]

    const req = require(`../githubReleasesRequest`)(...repo);

    req.then(o => {
        if(o && typeof o == `object` && !o.error) lastRequest = o;
    });

    return req;
};