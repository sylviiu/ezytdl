module.exports = () => new Promise(async (res, rej) => {
    const child_process = require(`child_process`);
    const which = require(`which`);

    const python = await which(`python3`) || await which(`py`);

    if(python) {
        commands = [
            [`-m`, `pip`, `install`, `-r`, `requirements.txt`],
            [`devscripts/make_lazy_extractors.py`],
        ]

        for(const cmd of commands) {
            const cwd = __dirname.split(`buildscripts`).slice(0, -1).join(`buildscripts`) + `yt-dlp`;

            const venv = child_process.execFileSync(python, [`-m`, `venv`, cwd], { stdio: `inherit` })

            const args = cmd;

            args.unshift(`-m`, `venv`, cwd)

            console.log(`Executing python ${python}; "${args.join(` `)}" in ${cwd}`);
            child_process.execFileSync(python, args, { stdio: `inherit`,  cwd });
        }
    } else {
        rej(`python not installed`)
    }
})