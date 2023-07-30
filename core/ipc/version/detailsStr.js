const getPath = require(`../../../util/getPath`);

const month = [`Jan`, `Feb`, `Mar`, `Apr`, `May`, `Jun`, `Jul`, `Aug`, `Sep`, `Oct`, `Nov`, `Dec`]
const dayOfWeek = [`Sunday`, `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`, `Saturday`]

module.exports = {
    type: `handle`,
    func: (_e, d) => new Promise(async res => {
        const package = require(`../../../package.json`);

        let appVersions = {};

        if(package.buildInfo) {
            appVersions = package.buildInfo
        } else if(await getPath(`./build.js`, true, false, true)) {
            appVersions = (await require(`../../../build.js`).getFullMetadata()).extraMetadata.buildInfo
        } else if(await getPath(`./build.json`, true, false, true)) {
            appVersions = require(`../../../build.json`).extraMetadata.buildInfo
        }
        
        Object.assign(appVersions, {
            "Node.JS": {
                "Version": `${process.versions.node} (${process.release.lts || process.release.name})`,
                "V8": process.versions.v8,
                "Platform": process.platform,
                "Arch": process.arch,
            },
        });

        const details = [];

        await require(`../../../util/currentVersion/pybridge`)()

        const useObj = Object.assign({}, appVersions, require(`../../../util/pythonBridge`).bridgeVersions || {});

        console.log(useObj)

        Object.keys(useObj).filter(s => !s.includes(`Libraries`)).forEach(pkg => {
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

        Object.keys(useObj).filter(s => s.includes(`Libraries`)).forEach(pkg => {
            details.push(``, `#### ${pkg}`);
            Object.entries(useObj.Libraries).forEach(([k, v]) => {
                details.push(`- [${k}](https://www.npmjs.com/package/${k}): [${v}](https://www.npmjs.com/package/${k}/v/${v})`)
            });
        });

        const returnStr = details.slice(1);

        console.log(returnStr)

        return res(returnStr)
    })
}