const pfs = require(`./promisifiedFS`);
const getPath = require(`./getPath`);
const sendNotification = require(`../core/sendNotification`);

let alreadyChecked = false;

module.exports = (force) => new Promise(async res => {
    const config = await require(`../getConfig`)();

    const lastUpdateCheck = config.lastUpdateCheck || 0;
    const updateCheckDaysInterval = config.updateCheckDaysInterval;

    const offset = updateCheckDaysInterval * 8.64e+7;

    console.log(`config lastUpdateCheck`, config.lastUpdateCheck, `lastUpdateCheck`, lastUpdateCheck, `offset`, offset, `Date.now()`, Date.now(), `lastUpdateCheck + offset`, lastUpdateCheck + offset)

    if(force || (!alreadyChecked && lastUpdateCheck + offset < Date.now())) {
        alreadyChecked = true;
        
        const path = await getPath(`./util/updateAvailable`, true, false, true)

        const checks = await pfs.readdirSync(path);

        const enabled = checks.filter(name => config.checkForUpdates[name.split(`.`).slice(0, -1).join(`.`)]);

        const skipped = [];

        const failed = [];

        if(enabled.includes(`ezytdl.js`)) enabled.push(enabled.splice(enabled.indexOf(`ezytdl.js`), 1)[0])

        console.log(`Checking for updates... (enabled: ${enabled.join(`, `)})`);

        let successful = 0;

        let availableUpdates = 0;

        for(const file of enabled) await new Promise(async res => {
            console.log(`Checking ${file}...`);

            const skip = await new Promise(async res => {
                if(await pfs.existsSync(`./util/filenames/${file}`)) {
                    const { getPathPromise, getPath } = require(`./filenames/${file}`);

                    if(typeof getPathPromise == `function` || typeof getPath == `function`) {
                        if(typeof getPathPromise == `function`) {
                            const path = await getPathPromise();
                            if(path) res(false);
                            else res(`Not installed.`);
                        } else {
                            const path = getPath();
                            if(path) res(false);
                            else res(`Not installed.`);
                        }
                    } else res(false);
                } else res(false);
            });

            const { name, description, check } = require(`./updateAvailable/${file}`);

            if(!skip) {
                check().then(async result => {
                    console.log(`update available for ${file}? ${result}`)
                    if(typeof result == `string`) {
                        console.log(`Update available! (${file})`);
                        availableUpdates++;
                        sendNotification({
                            headingText: `${name} - Update available!`,
                            bodyText: `An update for ${name} (${description}) is available!`,
                            redirect: `updating.html?${file.split(`.`).slice(0, -1).join(`.`)}=`,
                            redirectMsg: `Update ${name} to ${result}`
                        })
                    };
                    successful++;
                    res();
                }).catch(e => {
                    failed.push({ name, reason: `${e}` })
                    console.log(`update available for ${file}? false --`, e)
                    res();
                });
            } else {
                successful++;
                skipped.push({ name, reason: skip });
                console.log(`update available for ${file}? false -- skipped!`)
                res();
            }
        });

        console.log(`Checked for updates! (${successful}/${enabled.length} successful)`)

        if(availableUpdates == 0) {
            const strings = [];

            if(failed.length) strings.push(`failed: ${failed.map(s => `${s.name} -- ${s.reason}`)}`)
            if(skipped.length) strings.push(`skipped: ${skipped.map(s => `${s.name} -- ${s.reason}`)}`)

            sendNotification({
                headingText: `No updates available!`,
                bodyText: `You are up to date! (checked: ${enabled.map(s => require(`./updateAvailable/${s}`).name).join(`, `)})\n\n` + (strings.length ? `(${strings.filter(s => s).join(`)\n(`)})` : ``),
                systemAllowed: force ? true : false,
            });
        }

        if(successful == enabled.length) {
            const newUpdateCheck = Date.now();

            await require(`../getConfig`)({lastUpdateCheck: newUpdateCheck});
            console.log(`Updated lastUpdateCheck to ${newUpdateCheck}`)
        }
    };

    res()
})