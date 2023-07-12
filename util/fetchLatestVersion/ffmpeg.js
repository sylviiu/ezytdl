module.exports = () => {
    return require(`../githubReleasesRequest`)(...(process.platform == `darwin` ? [`eugeneware`, `ffmpeg-static`] : [`yt-dlp`, `FFmpeg-Builds`]));
}