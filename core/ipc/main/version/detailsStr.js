const getPath = require(`../../../../util/getPath`);

const month = [`Jan`, `Feb`, `Mar`, `Apr`, `May`, `Jun`, `Jul`, `Aug`, `Sep`, `Oct`, `Nov`, `Dec`];
const dayOfWeek = [`Sunday`, `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`, `Saturday`];

const iconMappings = {
    lib: {
        app: `hard-drive`,
        src: `cloud`
    }
};

const parseValue = (k, v) => {
    if(k.toLowerCase() == `built`) {
        const date = new Date(v);
        
        const time = {
            h: date.getHours(),
            m: date.getMinutes(),
            s: date.getSeconds(),
        }
        
        Object.entries(time).forEach(([k, v]) => v < 10 ? time[k] = `0${v}` : null)

        return `${dayOfWeek[date.getDay()]}, ${month[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} at ${Object.values(time).join(`:`)}`
    } else return v;
}

const parseValues = (o) => {
    Object.entries(o).forEach(([k, v]) => {
        o[k] = parseValue(k, v);
    });

    return o;
};

// `${useObj[`ezytdl-pybridge`][`Supported sites`].length} sites`

const mapPybridgeSites = (obj) => {
    const individual = (o) => ({
        [o.name]: {
            icon: o.broken && `circle-xmark` || o.includes?.length && `circle-plus` || `circle`,
            value: [ o.broken && `[BROKEN]`, o.description || ` `, o.includes?.length && `(+ ${o.includes.length} extra)` ].filter(Boolean).join(` `),
            expanded: o.includes?.length && o.includes.map(o2 => ({
                [o2.name]: mapPybridgeSites(o2)
            })).reduce((a, b) => Object.assign(a, b), {}) || undefined
        }
    });

    if(Array.isArray(obj)) {
        return obj.map(individual).reduce((a, b) => Object.assign(a, b), {});
    } else return individual(obj)[obj.name];
}

module.exports = {
    type: `handle`,
    func: (_e, d) => new Promise(async res => {
        const package = require(`../../../../package.json`);

        let appVersions = {};

        if(package.buildInfo) {
            appVersions = package.buildInfo
        } else if(await getPath(`./build.js`, true, false, true)) {
            appVersions = (await require(`../../../../build.js`).getFullMetadata()).extraMetadata.buildInfo
        } else if(await getPath(`./build.json`, true, false, true)) {
            appVersions = require(`../../../../build.json`).extraMetadata.buildInfo
        }

        await require(`../../../../util/currentVersion/pybridge`)() // fetch version info

        const useObj = Object.assign({}, appVersions, require(`../../../../util/pythonBridge`).bridgeVersions || {});

        const support = useObj[`ezytdl-pybridge`][`Supported sites`];
        if(support) delete useObj[`ezytdl-pybridge`][`Supported sites`];

        const details = Object.entries({
            "ezytdl": {
                icon: `circle-down`,
            },
            "ezytdl-pybridge": {
                icon: `floppy-disk`,
                value: {
                    ...(useObj[`ezytdl-pybridge`] && Object.entries(useObj[`ezytdl-pybridge`]).map(([k, v]) => ({
                        [`\`[bridge]\` ${k}`]: {
                            icon: `circle-down`,
                            value: parseValue(k, v)
                        }
                    })).reduce((a, b) => Object.assign(a, b), {}) || {}),
                    ...(useObj[`yt-dlp`] && Object.entries(useObj[`yt-dlp`]).map(([k, v]) => ({
                        [`\`[yt-dlp]\` ${k}`]: {
                            icon: `circle-dot`,
                            value: parseValue(k, v)
                        }
                    })).reduce((a, b) => Object.assign(a, b), {}) || {}),
                    ...(support && {
                        "`[yt-dlp]` Supported Websites": {
                            icon: `circle-dot`,
                            value: `${Object.keys(support).length} sites`,
                            expanded: mapPybridgeSites(Object.entries(support).map(([ name, obj ]) => ({ name, ...obj })))
                        }
                    } || {})
                }
            },
            "Electron": {
                icon: `atom`,
            },
            "Node.JS": {
                icon: `node-js`,
                value: {
                    "Version": `${process.versions.node} (${process.release.lts || process.release.name})`,
                    "V8": process.versions.v8,
                    "Platform": process.platform,
                    "Arch": process.arch,
                },
            },
            "Libraries": {
                icon: `book`,
                value: Object.keys(appVersions.Libraries).map(type => Object.entries(appVersions.Libraries[type]).map(([k, v]) => ({
                    [`\`[${type}]\` ${k}`]: {
                        icon: iconMappings.lib[type] || `book`,
                        value: `[${v.version}](${v.url.version})`,
                        expanded: Object.entries({
                            "Description": {
                                icon: `file-alt`,
                                value: v.details.description
                            },
                            "Author": {
                                icon: `user`,
                                value: v.details.author
                            },
                            "License": {
                                icon: `balance-scale-right`,
                                value: v.details.license
                            },
                            "Package Info": {
                                icon: `caret-right`,
                                value: `Additional package details`,
                                expanded: Object.entries(v.details.package).map(([k, v]) => ({ [k]: `\`${v}\`` })).reduce((a, b) => Object.assign(a, b), {})
                            },
                        }).filter(([k, v]) => v.value || v.expanded).reduce((a, b) => Object.assign(a, { [b[0]]: b[1] }), {})
                    }
                })).reduce((a, b) => Object.assign(a, b), {})).reduce((a, b) => Object.assign(a, b), {})
            },
        }).map(([k, v]) => ({ [k]: Object.assign(v, !v.value && { value: parseValues(useObj[k]) } || {}) })).reduce((a, b) => Object.assign(a, b), {});

        console.log(details)

        return res(details);
    })
}