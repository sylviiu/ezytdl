const fs = require('fs');
const superagent = require('superagent');

const { config, getFullMetadata } = require(`../build`);

(() => new Promise(async res => {
    if(process.env.GITHUB_TOKEN) {
        await getFullMetadata();

        const request = (path, opt={}) => new Promise(async (res, rej) => {
            const method = ((typeof opt.method == `string` && typeof superagent[opt.method?.toLowerCase()] == `function`) ? opt.method : `GET`).toLowerCase();
            const body = opt.body;
            const headers = {
                "User-Agent": "node",
                Accept: `application/vnd.github.v3+json`,
                ...opt.headers,
                Authorization: `token ${process.env.GITHUB_TOKEN}`,
            };
        
            console.log(`[ ${method} ] ${path}`, { headers, body });
        
            const req = (superagent[method] || superagent.get)(path).set(headers)
            if(body) req.send(body);
            
            if(headers.Accept.includes(`application/octet-stream`)) {
                // buffer object for binary files
                req.buffer(true);
            }
        
            // resolve with the parsed response
            req.then(r => res(r.body)).catch(e => {
                console.error(`req failed: ${e}`)
                rej(e);
            })
        });

        const release = await request(`https://api.github.com/repos/${config.extraMetadata.owner[0]}/${config.extraMetadata.owner[1]}/releases/latest`);
        console.log(`release`, release);

        const user = await request(`https://api.github.com/user`);
        console.log(`logged in as ${user.login} (${user.name}) -- running platform scripts`);

        const platformScripts = fs.existsSync(`./devscripts/platforms/${process.platform}`) && fs.readdirSync(`./devscripts/platforms/${process.platform}`).filter(f => f.endsWith(`.js`)) || [];
    
        console.log(`running ${platformScripts.length} platform scripts (${process.platform})`);
    
        const responses = {};
    
        for(const file of platformScripts) responses[file] = await (require(`./platforms/${process.platform}/${file}`)({
            request,
            config,
            release,
            user,
        }));
    
        res(responses);
    } else {
        return res({ error: `no github token` });
    }
}))()