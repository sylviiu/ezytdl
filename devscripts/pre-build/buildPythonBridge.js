const child_process = require(`child_process`);
const path = require(`path`);
const fs = require(`fs`);
const fse = require(`fs-extra`);
const { platform } = require("os");

module.exports = () => new Promise(async res => {
    const ytdlpPath = path.join(__dirname.split(`devscripts`)[0], `ytdlp`);

    const venvLocation = path.join(ytdlpPath, `.venv`)

    console.log(`building python bridge...\n- ytdlp path: ${ytdlpPath}\n- venv location: ${venvLocation}`)

    if(fs.existsSync(venvLocation)) {
        console.log(`removing old venv...`)
        fs.rmSync(venvLocation, {recursive: true, force: true});
    }

    console.log(`creating venv...`)
    child_process.execFileSync(`python`, [`-m`, `venv`, `.venv`], {stdio: `inherit`, cwd: ytdlpPath});

    const bindir = process.platform == `win32` ? path.join(venvLocation, `Scripts`) : path.join(venvLocation, `bin`);
    const pipPath = process.platform == `win32` ? path.join(bindir, `pip.exe`) : path.join(bindir, `pip`);

    console.log(`installing packages...\n- bindir: ${bindir}\n- pip path: ${pipPath}`)

    child_process.execFileSync(pipPath, [`install`, `-r`, `requirements.txt`], {stdio: `inherit`, cwd: ytdlpPath});

    console.log(`installing cxfreeze...`)

    child_process.execFileSync(pipPath, [`install`, `cx_Freeze`], {stdio: `inherit`, cwd: ytdlpPath});

    console.log(`building bridge...`)

    child_process.execFileSync(process.platform == `win32` ? path.join(bindir, `cxfreeze.exe`) : path.join(bindir, `cxfreeze`), [`-c`, `bridge.py`, `--target-dir`, `../pybridge`], {stdio: `inherit`, cwd: ytdlpPath});

    console.log(`done!`)

    res()
});