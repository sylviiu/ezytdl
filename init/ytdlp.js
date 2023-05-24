global.useBridge = false;

module.exports = () => new Promise(async res => {
    const which = require(`which`);

    if(await which(`python3`)) {
        global.useBridge = true;
    } else {
        require(`../checks/ytdlpIsDownloaded`)(true).then(res)
    }
})