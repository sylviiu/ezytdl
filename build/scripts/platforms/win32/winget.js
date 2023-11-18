const crypto = require(`crypto`);
const fs = require(`fs`);

const parseVariables = require(`../../../../util/parseVariables`);

const headers = process.env.GITHUB_TOKEN && {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: `application/vnd.github.v3+json`
}

module.exports = (config) => new Promise(async res => {
    const vars = {
        publisher: config.appId.split(`.`)[1],

        packageName: config.appId.split(`.`).slice(2).join(`.`),
        packageIdentifier: config.appId.split(`.`).slice(1).join(`.`),
        packageLicense: require(`../../../../package.json`).license,
        packageDescription: require(`../../../../package.json`).description,
        packageVersion: config.extraMetadata.version,

        download: `https://github.com/${config.publish?.owner}/${config.publish?.repo}/releases/download/${config.extraMetadata.version}/${config.productName}-win32.exe`,

        year: new Date().getFullYear(),
    };

    const hash = crypto.createHash(`sha256`);
    hash.update(fs.readFileSync(`./dist/${config.productName}-win32.exe`));
    vars.packageSha256 = hash.digest(`hex`).toUpperCase();

    console.log(`vars`, vars);

    return res(); // TODO: proper implementation

    if(!config.publish || config.extraMetadata.version.includes(`-dev.`) || !headers) {
        console.log(`skipping winget sync (headers: ${headers}, version: ${config.extraMetadata.version}, publish: ${config.publish})`);
        return res(false);
    }

    const user = await request(`https://api.github.com/user`, { headers });

    console.log(`logged in as ${user.login} (${user.name}) -- finding winget packages fork`);

    let wingetRepo = await request(`https://api.github.com/repos/${user.login}/winget-pkgs`, { headers });

    if(wingetRepo.message || !wingetRepo.fork) {
        await new Promise(async r => {
            console.log(`winget repo not found, forking winget-pkgs`);
    
            const fork = await request(`https://api.github.com/repos/microsoft/winget-pkgs/forks`, { method: `POST`, headers });
    
            console.log(`forked winget-pkgs to ${fork.full_name}`);
    
            while(true) {
                const status = await request(`https://api.github.com/repos/${fork.full_name}`, { headers });
    
                if(status.fork) break;
    
                await new Promise(r2 => setTimeout(r2, 1000));
            }

            wingetRepo = fork;
    
            r();
        });
    } else {
        await new Promise(async r => {
            // sync with upstream

            console.log(`syncing with upstream`);

            const sync = await request(`https://api.github.com/repos/${wingetRepo.full_name}/merge-upstream`, {
                method: `POST`,
                headers,
                body: JSON.stringify({
                    branch: `master`
                })
            });

            r(console.log(`synced with upstream`));
        })
    };

    const branchName = `${config.appId}-${config.extraMetadata.version}`;
    
    console.log(`creating branch ${branchName}`);

    const branch = await request(`https://api.github.com/repos/${wingetRepo.full_name}/git/refs`, {
        method: `POST`,
        headers,
        body: JSON.stringify({
            ref: `refs/heads/${branchName}`,
            sha: wingetRepo.default_branch
        })
    });

    console.log(`created branch ${branchName}`);

    const files = fs.readdirSync(`./build/scripts/platforms/win32/winget`).map(file => ({
        path: `manifests/${vars.packageIdentifier[0]}/${vars.packageIdentifier.split(`.`).join(`/`)}/${file}`,
        content: parseVariables(null, vars, fs.readFileSync(`./build/scripts/platforms/win32/winget/${file}`).toString())
    }));
})