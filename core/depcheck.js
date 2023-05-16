const fs = require('fs');
const path = require('path');
const errorHandler = require(`../util/errorHandler`);
const errorAndExit = require(`../util/errorAndExit`)
const sendNotification = require(`./sendNotification`)

const depcheckPath = path.join(__dirname + `/depcheck/` + process.platform)

module.exports = () => new Promise(async res => {
    console.log(`Verifying dependencies at ${depcheckPath}`)
    if(fs.existsSync(depcheckPath)) {
        console.log(`depchecks available for platform ${process.platform} -- running`);
        const depchecks = fs.readdirSync(depcheckPath);

        let missingDependencies = [];
        let missingUnrequiredDependencies = [];

        for(let file of depchecks) {
            console.log(`Checking dependency ${process.platform}/${file}`)
            try {
                const check = require(`./depcheck/${process.platform}/${file}`);

                const result = await check.func();

                console.log(`${file} = ${result.status}`)

                if(result.status == false) {
                    if(result.missing && result.required) {
                        missingDependencies.push(...[typeof result.missing == `object` ? result.missing : [result.missing]])
                    } else if(result.missing) {
                        missingUnrequiredDependencies.push(...[typeof result.missing == `object` ? result.missing : [result.missing]])
                    } else {
                        return errorHandler(`Unknown dependency check error!\n\n${JSON.stringify(result, null, 4)}`)
                    }
                };
            } catch(e) {
                return errorHandler(e)
            }
        };

        console.log(missingDependencies, missingUnrequiredDependencies)

        if(missingDependencies.length === 0 && missingUnrequiredDependencies.length > 0) {
            console.log(`sending warning notif about missing libs`)
            sendNotification({
                headingText: `Missing system dependencies`,
                bodyText: `You're missing some dependencies that ezytdl utilizes!\n\nMissing: ${missingUnrequiredDependencies.join(`, `)}\n\nezytdl will still work for the most part, but some features may be limited!`,
                type: `warn`,
            });
            res(true);
        } else if(missingDependencies.length > 0) {
            return errorAndExit(`Failed to start ezytdl v${require(`../package.json`).version} -- your system is missing dependencies!\n\n- Missing: ${[...missingDependencies, ...missingUnrequiredDependencies.map(s => s + ` (not required)`)].join(`, `)}`)
        } else return res(true);
    } else res(null);
})