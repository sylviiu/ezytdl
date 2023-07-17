module.exports = () => new Promise(async res => {
    const pfs = require(`../util/promisifiedFS`)

    const splitter = process.platform == `win32` ? `;` : `:`

    try {
        const { shellEnv } = (await import('shell-env'));

        const originalPathSplit = process.env.PATH.split(splitter);

        console.log(`[PATH] Running "fixPath"...`);

        try {
            const env = await shellEnv();

            const p = env.PATH || env.Path || env.path;

            const locations = p.split(splitter);

            const filteredLocations = [];

            for(const location of locations) {
                if(await pfs.exists(location) && !originalPathSplit.includes(location)) filteredLocations.push(location)
            }

            console.log(`[PATH] New additional paths: ${filteredLocations.length}`)

            process.env.PATH += [...originalPathSplit, ...filteredLocations].join(splitter);

            const r = (`[PATH] Ran "fixPath" successfully - (${filteredLocations.length} found locations)`)
            console.log(r)
            res(r)
        } catch(e) {
            const r = `[PATH] Failed running "fixPath" -- ${e}`
            console.log(r)
            res(r)
        }
    } catch(e) {
        const r = `[PATH] Failed importing "fixPath" -- ${e}`
        console.log(r)
        res(r)
    }
})