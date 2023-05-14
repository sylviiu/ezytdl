const { createDownload } = require(`../../../util/downloadManager`);

module.exports = {
    type: `on`,
    func: (event, args) => {
        console.log(`Downloading format ${args.format} from ${args.url}`);
        const ytdlpProc = require(`../../../util/downloadManager`).createDownload(args, () => {}).catch(() => {});
    }
}