module.exports = () => new Promise(async res => {
    try {
        const fixPath = (await import('fix-path')).default;

        const originalPath = JSON.stringify(process.env.PATH);

        try {
            const p = await fixPath();
            const changed = JSON.stringify(process.env.PATH) != originalPath;
            const r = (`[PATH] Ran "fixPath" successfully; return value: ${p}` + (changed ? ` (changed)` : ` (unchanged)`))
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