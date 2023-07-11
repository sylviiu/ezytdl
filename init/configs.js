module.exports = () => new Promise(async res => {
    const configs = require(`../util/configs`);

    for(const conf of Object.entries(configs)) {
        console.log(`Creating config ${conf[0]}... (typeof ${typeof conf[1]})`)
        await conf[1]();
    };

    res();
})