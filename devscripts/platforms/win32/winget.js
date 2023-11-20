const crypto = require(`crypto`);
const fs = require(`fs`);
const path = require(`path`);
const child_process = require(`child_process`);
const superagent = require(`superagent`);

const { config, getFullMetadata } = require(`../../../build`);
const parseVariables = require(`../../../util/parseVariables`);

const request = process.env.GITHUB_TOKEN && ((path, opt={}) => new Promise(async (res, rej) => {
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
})) || null;

const filename = `ezytdl-win32.exe`;

module.exports = () => new Promise(async res => {
    if(!request) {
        console.log(`skipping winget sync (request: ${request})`);
        return res(false);
    }

    await getFullMetadata();

    const release = await request(`https://api.github.com/repos/${config.extraMetadata.owner[0]}/${config.extraMetadata.owner[1]}/releases/latest`);
    const thisFile = release.assets.find(a => a.name == filename);

    if(!thisFile) {
        console.log(`skipping winget sync (thisFile: ${thisFile})`);
        return res(false);
    }

    const package = await new Promise(async res => {
        const o = {
            download: thisFile.browser_download_url,

            packageName: config.appId.split(`.`).slice(2).join(`.`),
            packageIdentifier: config.appId.split(`.`).slice(1).join(`.`),
            packageLicense: require(`../../../package.json`).license,
            packageDescription: require(`../../../package.json`).description,
            packageVersion: config.extraMetadata.version || require(`../../../package.json`).version,
        };

        console.log(`downloading ${thisFile.url} (${thisFile.size / 1024 / 1024}MB)`)

        const buffer = await request(thisFile.url, { headers: { Accept: `application/octet-stream` } });
        console.log(`downloaded ${buffer.length / 1024 / 1024}/${thisFile.size / 1024 / 1024} MB -- creating hash`);

        o.packageSha256 = crypto.createHash(`sha256`).update(buffer).digest(`hex`).toUpperCase();
        console.log(`hash: ${o.packageSha256}`);

        return res(o);
    });

    console.log(`package`, package);

    const hash = crypto.createHash(`sha256`);
    hash.update(fs.readFileSync(`./dist/${config.productName}-win32.exe`));
    package.packageSha256 = hash.digest(`hex`).toUpperCase();

    const vars = {
        ...package,
        publisher: config.appId.split(`.`)[1],
        year: new Date().getFullYear(),
    };

    console.log(`vars`, vars);

    const files = fs.readdirSync(`./devscripts/platforms/win32/winget`).map(file => ({
        path: `manifests/${package.packageIdentifier[0].toLowerCase()}/${package.packageIdentifier.split(`.`).join(`/`)}/${package.packageVersion}/${file}`,
        content: parseVariables(undefined, vars, fs.readFileSync(`./devscripts/platforms/win32/winget/${file}`).toString()).processed
    }));

    if(fs.existsSync(`./devscripts/platforms/win32/etc`)) fs.rmSync(`./devscripts/platforms/win32/etc`, { recursive: true });
    fs.mkdirSync(`./devscripts/platforms/win32/etc`, { recursive: true });
    for(const file of files) fs.writeFileSync(`./devscripts/platforms/win32/etc/${path.parse(file.path).base}`, file.content);

    const wingetValidate = await new Promise(async res => {
        let log = [];

        const cmd = [`validate`, `./devscripts/platforms/win32/etc`, `--verbose`]

        const proc = child_process.spawn(`winget`, cmd);

        proc.stdout.on(`data`, data => log.push(`[STDOUT] ` + data.toString().trim()));
        proc.stderr.on(`data`, data => log.push(`[STDERR] ` + data.toString().trim()));

        proc.on(`close`, code => {            
            console.log(`winget validation exited with code ${code}`, log);

            res({
                version: `${child_process.execSync(`winget --version`).toString().trim()}`,
                command: `winget ${cmd.map(s => s.includes(` `) ? `"${s}"` : s).join(` `)}`,
                code,
                stdout: log.join(`\n`)
            });
        });
    });

    if(wingetValidate.code) {
        console.log(`winget validation failed (code ${wingetValidate.code}); will not proceed\n\nlog:\n`, wingetValidate.stdout);
        return res({ error: wingetValidate });
    } else console.log(`generated winget manifest files!`, wingetValidate);

    const user = await request(`https://api.github.com/user`);
    console.log(`logged in as ${user.login} (${user.name}) -- finding winget packages fork`);

    let parentWingetRepo = await request(`https://api.github.com/repos/microsoft/winget-pkgs`);
    let wingetRepo = await request(`https://api.github.com/repos/${user.login}/winget-pkgs`);
    if(wingetRepo.message) {
        console.log(`winget repo not found, forking winget-pkgs`);

        await new Promise(async r => {    
            const fork = await request(`https://api.github.com/repos/microsoft/winget-pkgs/forks`, { method: `POST` });
    
            console.log(`forked winget-pkgs to ${fork.full_name}`, fork);
    
            while(true) {
                const status = await request(`https://api.github.com/repos/${fork.full_name}`);
    
                if(status.fork) {
                    console.log(`forked winget-pkgs to ${fork.full_name} successfully!`);

                    wingetRepo = status;

                    break;
                }
    
                await new Promise(r2 => setTimeout(r2, 1000));
            }

            r();
        });
    } else {
        console.log(`winget repo found! syncing upstream...`);
        
        await new Promise(async r => {
            console.log(`syncing with upstream`);

            await request(`https://api.github.com/repos/${wingetRepo.full_name}/merge-upstream`, {
                method: `POST`,
                body: {
                    branch: parentWingetRepo.default_branch
                }
            }); console.log(`synced with upstream`);

            wingetRepo = await request(`https://api.github.com/repos/${user.login}/winget-pkgs`);

            r(console.log(`synced with upstream`));
        })
    };

    console.log(`winget repo`);

    const currentSha = await request(`https://api.github.com/repos/${wingetRepo.full_name}/git/refs/heads/${wingetRepo.default_branch}`);
    console.log(`current sha`, currentSha?.object?.sha);

    const branchName = `${config.appId}-${package.packageVersion}`.replace(/\./g, `-`);
    await request(`https://api.github.com/repos/${wingetRepo.full_name}/git/refs`, {
        method: `POST`,
        body: {
            ref: `refs/heads/${branchName}`,
            sha: currentSha.object.sha
        }
    }); console.log(`created branch "${branchName}"`);

    const blobs = [];
    for(const i in files) {
        const file = files[i];
        const blob = await request(`https://api.github.com/repos/${wingetRepo.full_name}/git/blobs`, {
            method: `POST`,
            body: {
                content: file.content,
                encoding: `utf-8`
            }
        });
        console.log(`created blob #${Number(i) + 1} for "${file.path}" (${blob.sha})`);
        blobs.push({ ...file, ...blob });
    };

    const tree = await request(`https://api.github.com/repos/${wingetRepo.full_name}/git/trees`, {
        method: `POST`,
        body: {
            base_tree: currentSha.object.sha,
            tree: blobs.map(blob => ({
                path: blob.path,
                mode: `100644`,
                type: `blob`,
                sha: blob.sha
            }))
        }
    }); console.log(`created tree`);

    const commit = await request(`https://api.github.com/repos/${wingetRepo.full_name}/git/commits`, {
        method: `POST`,
        body: {
            message: `Add ${package.packageName} ${package.packageVersion}`,
            tree: tree.sha,
            parents: [currentSha.object.sha]
        }
    }); console.log(`created commit`);

    await request(`https://api.github.com/repos/${wingetRepo.full_name}/git/refs/heads/${branchName}`, {
        method: `PATCH`,
        body: {
            sha: commit.sha
        }
    }); console.log(`updated branch`);

    console.log(`creating pull request`);

    const body = [
        `#### The manifest was validated (with winget ${wingetValidate.version}) before this pull request was created\n\`> ${wingetValidate.command} (exit code ${wingetValidate.code})\`\n\`\`\`\n${wingetValidate.stdout}\n\`\`\``,
    ];

    const details = {
        title: `New version: ${package.packageIdentifier} version ${package.packageVersion}`,
        body: `## Pull request & manifest programmatically generated\n\n${body.map(s => `> ${s.split(`\n`).join(`\n> `)}`).join(`\n\n`)}\n\n---\n\n`
    }

    /*const pull = await request(`https://api.github.com/repos/${wingetRepo.full_name}/pulls`, {
        method: `POST`,
        body: {
            ...details,
            head: branchName,
            base: wingetRepo.default_branch,
        }
    });*/

    const pull = await request(`https://api.github.com/repos/${parentWingetRepo.full_name}/pulls`, {
        method: `POST`,
        body: {
            ...details,
            head: `${user.login}:${branchName}`,
            base: parentWingetRepo.default_branch,
        }
    });

    console.log(`created pull request`, pull);
})