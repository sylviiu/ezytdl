module.exports = () => new Promise(async res => {
    const { bindir, pyenvPath } = require(`../util/filenames/python`);
    const path = require(`path`);

    process.env.PYTHON_BIN = process.platform == `win32` ? path.join(bindir, `python.exe`) : path.join(bindir, `python`);
    process.env.PATH = process.platform == `win32` ? `${bindir};${process.env.PATH}` : `${bindir}:${process.env.PATH}`
    process.env.VIRTUAL_ENV = pyenvPath;

    console.log(`\nnew instance path: ${process.env.PATH}\n\nbindir: ${bindir}\n\nPYTHON_BIN: ${process.env.PYTHON_BIN}\n\nVIRTUAL_ENV: ${process.env.VIRTUAL_ENV}\n`);

    const pythonModule = await import(`pythonia`);

    console.log(`Python imported!`, pythonModule);

    const { python } = pythonModule;

    setTimeout(async () => {
        console.log(python);

        const ytdlp = await python(`yt_dlp`);

        console.log(ytdlp);
    }, 1000)
})