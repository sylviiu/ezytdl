const pfs = require(`../../util/promisifiedFS`);

module.exports = ({ buildArgs, package, path }) => new Promise(async res => {
    const json = JSON.stringify({
        name: `ezytdl`,
        description: `ezytdl connector for firefox`,
        path,
        type: `stdio`,
        allowed_extensions: [`ezytdl@sylviiu.dev`],
    }, null, 4);

    console.log(`firefox connector json:`, json);

    await pfs.writeFileSync(`./firefox.json`, json)

    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging#windows_setup

    if(process.platform == `win32`) {
        const child_process = require(`child_process`);


    }
});