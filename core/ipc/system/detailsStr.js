const month = [`Jan`, `Feb`, `Mar`, `Apr`, `May`, `Jun`, `Jul`, `Aug`, `Sep`, `Oct`, `Nov`, `Dec`]
const dayOfWeek = [`Sunday`, `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`, `Saturday`]

const pkg = require(`../../../package.json`);

const appVersions = {
    "ezytdl": {
        "Version": pkg.version,
        "Commit Hash": pkg.fullCommitHash || `unknown`,
        "Built": pkg.buildDate || global.startTime,
    },
    "Node.JS": {
        "Version": `${process.versions.node} (${process.release.lts || process.release.name})`,
        "V8": process.versions.v8,
        "Platform": process.platform,
        "Arch": process.arch,
    },
    "Electron": {
        "Version": pkg.devDependencies.electron.replace(`^`, ``),
        "Builder": pkg.devDependencies[`electron-builder`].replace(`^`, ``),
    }
}

module.exports = {
    type: `handle`,
    func: (_e, d) => new Promise(async res => {
        const details = [];

        const useObj = Object.assign({}, appVersions, require(`../../../util/pythonBridge`).bridgeVersions || {});

        console.log(useObj)

        Object.keys(useObj).forEach(pkg => {
            details.push(``, `#### ${pkg}`);
            Object.entries(useObj[pkg]).forEach(([k, v]) => {
                if(k.toLowerCase() == `built`) {
                    const date = new Date(v);
                    
                    const time = {
                        h: date.getHours(),
                        m: date.getMinutes(),
                        s: date.getSeconds(),
                    }
                    
                    Object.entries(time).forEach(([k, v]) => v < 10 ? time[k] = `0${v}` : null)

                    v = `${dayOfWeek[date.getDay()]}, ${month[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} at ${Object.values(time).join(`:`)}`
                };
                
                details.push(`- ${k}: ${v}`)
            });
        });

        return res(details.slice(1))
    })
}