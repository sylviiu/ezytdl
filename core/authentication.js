const fs = require('fs');
const path = require('path');

const { safeStorage } = require(`electron`)

const sendNotification = require(`../core/sendNotification`);

let websiteMap = new Map();

const clients = require(`fs`).readdirSync(require(`../util/getPath`)(`./core/authentication`, true) || []).map(f => {
    const module = require(`./authentication/${f}`);

    const retObj = Object.assign(module, { name: f.split(`.`).slice(0, -1).join(`.`) });

    if(retObj.urls) retObj.urls.forEach(u => websiteMap.set(u, retObj));

    return retObj;
});

console.log(`---------------------\n${clients.length} authentication clients found:\n${clients.map(o => `${o.name} / [${o.urls.join(` | `)}]`).join(`\n`)}\n---------------------`)

module.exports = {
    check: (arg) => {
        if(clients.find(c => c.name == arg)) return arg;

        const parsed = require(`url`).parse(`${arg}`);

        if(websiteMap.has(parsed.host)) return websiteMap.get(parsed.host).name;
        if(websiteMap.has(parsed.hostname)) return websiteMap.get(parsed.hostname).name;
        if(websiteMap.has(parsed.href)) return websiteMap.get(parsed.href).name;

        return false;
    },
    list: () => {
        const retObj = {};

        clients.forEach(c => retObj[c.name] = {
            urls: c.urls,
            authSaved: fs.existsSync(path.join(global.configPath, `auth`, c.name))
        });

        return retObj;
    },
    remove: (rawService) => {
        const service = module.exports.check(rawService);
        const client = clients.find(c => c.name == service);
        
        if(fs.existsSync(path.join(global.configPath, `auth`, service))) {
            fs.unlinkSync(path.join(global.configPath, `auth`, service));
            if(client && client.reset) {
                console.log(`resetting ${service} authentication`)
                client.reset();
            };
            return true;
        } else return false;
    },
    getKey: (rawService, force) => new Promise(async res => {
        const service = module.exports.check(rawService);
        console.log(`searching for auth service ${service} / ${rawService}`)
        if(clients.find(c => c.name == service)) {
            console.log(`using ${service} authentication client`);
    
            const returnMsg = (error) => sendNotification({
                type: error ? `warn` : `info`,
                headingText: `Authentication to ${service[0].toUpperCase() + service.slice(1)}`,
                bodyText: `Authentication to ${service[0].toUpperCase() + service.slice(1)} has ${error ? `failed` : `been completed`}.` + (error ? `\n\n${error}` : ``)
            })
    
            if(!fs.existsSync(path.join(global.configPath, `auth`, service)) || force) {
                console.log(`auth file does not exist / force: ${force}, running setup`)
    
                clients.find(c => c.name == service).setup().then(r => {
                    fs.mkdirSync(path.join(global.configPath, `auth`), { recursive: true });
    
                    console.log(r)
    
                    if(typeof r == `string`) {
                        console.log(`authentication failed: ${r}`)
                        returnMsg(r);
                        return res(null);
                    } else {
                        console.log(`authentication succeeded: ${JSON.stringify(r)}`)
                        fs.writeFileSync(path.join(global.configPath, `auth`, service), safeStorage.encryptString(JSON.stringify(r, null, 4)));;
                        returnMsg();
                        return res(r);
                    };
                }).catch(e => {
                    console.log(`authentication failed: ${e}`)
                    returnMsg(e);
                    return res(null);
                })
            } else if(fs.existsSync(path.join(global.configPath, `auth`, service))) {
                console.log(`auth file exists, skipping setup`);
    
                try {
                    const file = fs.readFileSync(path.join(global.configPath, `auth`, service));
                    const obj = JSON.parse(safeStorage.decryptString(file));
                    return res(obj);
                } catch(e) {
                    console.log(`authentication failed: ${e} - restarting authentication`);
                    fs.unlinkSync(path.join(global.configPath, `auth`, service));
                    return module.exports(service, force).then(res);
                }
            };
        } else res(null);
    }),
    getToken: (rawService, force) => new Promise(async res => {
        const service = module.exports.check(rawService);

        const key = await module.exports.getKey(service, force);

        if(key && clients.find(c => c.name == service)) {
            if(clients.find(c => c.name == service) && clients.find(c => c.name == service).getToken) {
                clients.find(c => c.name == service).getToken(key).then(r => {
                    console.log(`got token`)
                    res(r.value);
                }).catch(e => {
                    console.log(`failed to get token: ${e}`)
                    res(null);
                })
            } else {
                console.log(`no getToken function found`)
                res(key);
            }
        } else res(null);
    })
}