const startTime = Date.now();

global.startTime = startTime;

global.testrun = process.argv.find(s => s == `--testrun`) ? true : false;
global.headless = process.argv.find(s => s == `--headless`) ? true : false;

console.log(`Starting ezytdl v${require(`./package.json`).version}`)

const { app, ipcMain } = require(`electron`);

if(global.testrun || global.headless) {
    app.commandLine.appendSwitch(`--ignore-gpu-blacklist`);
    app.disableHardwareAcceleration();
}

global.configPath = app.getPath('userData');

process.on(`uncaughtException`, (err) => (global.testrun ? require(`./util/errorAndExit`) : require(`./util/errorHandler`))(`${typeof err == `object` ? JSON.stringify(err, null, 4) : err}\n\n${err.stack? err.stack : `(no stack)`}`))
process.on(`unhandledRejection`, (err) => (global.testrun ? require(`./util/errorAndExit`) : require(`./util/errorHandler`))(`${typeof err == `object` ? JSON.stringify(err, null, 4) : err}\n\n${err.stack? err.stack : `(no stack)`}`))

if(process.argv.find(s => s == `--extension`)) {

} else require(`./system/main`)()

process.on(`SIGINT`, require(`./core/quit`).quit);