module.exports = () => new Promise(async res => {
    const configs = require(`../util/configs`);

    console.log(`configs:`, configs);

    for(const [ name, func ] of Object.entries(configs)) {
        console.log(`running config:`, name);
        await func(undefined, { waitForPromise: false });
        console.log(`config done:`, name);
    }

    res(configs.length);
})