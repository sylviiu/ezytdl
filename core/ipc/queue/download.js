const { createDownload } = require(`../../../util/downloadManager`).default;

module.exports = {
    type: `on`,
    func: (event, args) => {
        console.log(`Downloading format ${args.format} from ${args.url}`);
        const ytdlpProc = require(`../../../util/downloadManager`).default.createDownload(args, () => {}).catch(() => {});
    }
}