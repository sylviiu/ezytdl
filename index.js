const startTime = Date.now();

global.startTime = startTime;

global.testrun = process.argv.find(s => s == `--testrun`) ? true : false;
global.headless = process.argv.find(s => s == `--headless`) ? true : false;

const mode = (require(`yargs`).parse(process.argv)["run-script"] || `main`).toLowerCase();

console.log(`Starting ezytdl v${require(`./package.json`).version} in mode "${mode}"`)

const { app, ipcMain } = require(`electron`);

if(global.testrun || global.headless) {
    app.commandLine.appendSwitch(`--ignore-gpu-blacklist`);
    app.disableHardwareAcceleration();
}

global.configPath = app.getPath('userData');

process.on(`uncaughtException`, (err) => (global.testrun ? require(`./util/errorAndExit`) : require(`./util/errorHandler`))(`${typeof err == `object` ? JSON.stringify(err, null, 4) : err}\n\n${err.stack? err.stack : `(no stack)`}`))
process.on(`unhandledRejection`, (err) => (global.testrun ? require(`./util/errorAndExit`) : require(`./util/errorHandler`))(`${typeof err == `object` ? JSON.stringify(err, null, 4) : err}\n\n${err.stack? err.stack : `(no stack)`}`))

const fs = require(`fs`);
const getPath = require(`./util/getPath`);

if(getPath(`./system/${mode}.js`, true)) {
    require(`./system/${mode}.js`)();
} else return require(`./util/errorHandler`)(`Mode "${mode}" not found!`)

process.on(`SIGINT`, require(`./core/quit`).quit);