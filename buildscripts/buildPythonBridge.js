const child_process = require(`child_process`);
const path = require(`path`);
const fs = require(`fs`);
const which = require(`which`);

module.exports = () => new Promise(async res => {
    const ytdlpPath = path.join(__dirname.split(`buildscripts`)[0], `ytdlp`);
    const venvLocation = path.join(ytdlpPath, `.venv`)

    if(fs.existsSync(venvLocation)) {
        console.log(`removing old venv...`)
        fs.rmSync(venvLocation, {recursive: true, force: true});
    }

    const python = await new Promise(r => {
        which(`python`).then(r).catch(e => {
            which(`python3`).then(r).catch(e => {
                which(`py`).then(r).catch(e => {
                    console.log(`no python found!`);
                })
            })
        })
    });

    console.log(`building python bridge...\n- python path: ${python}\n- ytdlp path: ${ytdlpPath}\n- venv location: ${venvLocation}`)

    console.log(`creating venv...`)
    child_process.execFileSync(python, [`-m`, `venv`, `.venv`], {stdio: `inherit`, cwd: ytdlpPath});

    const bindir = process.platform == `win32` ? path.join(venvLocation, `Scripts`) : path.join(venvLocation, `bin`);
    const pipPath = process.platform == `win32` ? path.join(bindir, `pip.exe`) : path.join(bindir, `pip`);

    console.log(`installing packages...\n- bindir: ${bindir}\n- pip path: ${pipPath}`)
    child_process.execFileSync(pipPath, [`install`, `-r`, `requirements.txt`], {stdio: `inherit`, cwd: ytdlpPath});

    //console.log(`installing cxfreeze...`)
    //child_process.execFileSync(pipPath, [`install`, `cx_Freeze`], {stdio: `inherit`, cwd: ytdlpPath});

    console.log(`installing pyinstaller...`)
    child_process.execFileSync(pipPath, [`install`, `pyinstaller`], {stdio: `inherit`, cwd: ytdlpPath});

    console.log(`writing constants.py`);
    fs.writeFileSync(path.join(ytdlpPath, `constants.py`), `BUILD_DATE = ${Date.now()}`)

    if(fs.existsSync(`./pybridge`)) {
        console.log(`removing old compiled pybridge...`)
        fs.rmSync(`./pybridge`, {recursive: true, force: true});
    }

    console.log(`building bridge...`)
    //child_process.execFileSync(process.platform == `win32` ? path.join(bindir, `cxfreeze.exe`) : path.join(bindir, `cxfreeze`), [`-c`, `bridge.py`, `--target-dir`, `../pybridge`], {stdio: `inherit`, cwd: ytdlpPath});
    child_process.execFileSync(path.join(bindir, `pyinstaller`), [/*`--onefile`, */`bridge.py`, `--onedir`, `--workpath`, `./dist`, `--distpath`, `../`, `-y`, `--name`, `pybridge`], {stdio: `inherit`, cwd: ytdlpPath});

    console.log(`done!`)

    res()
});