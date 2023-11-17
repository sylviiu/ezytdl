const url = require(`url`).parse;

const { dependencies, devDependencies } = require(`../../package.json`);
const source = require(`./sourcePackage`);

module.exports = (name) => new Promise(async res => {
    const { pkg, lock } = await source(name);

    const main = {
        name, 
        version: `${dependencies[name] || devDependencies[name]}`.replace(`^`, ``)
    }, details = {};

    // Get package.json details

    if(pkg && typeof pkg == `object`) {
        if(pkg.author) details.author = pkg.author;
        if(pkg.license) details.license = pkg.license;

        if(pkg.description) details.description = pkg.description;
    };

    // Get package-lock.json details

    if(lock && typeof lock == `object`) {
        if(lock.version) main.version = lock.version;

        if(lock.resolved) {
            details.package = {
                integrity: lock.integrity,
                sourced: url(lock.resolved).host,
                file: url(lock.resolved).pathname.split(`/`).pop()
            }
        }
    }

    res({ 
        ...main, details,
        url: {
            package: `https://www.npmjs.com/package/${name}`,
            version: `https://www.npmjs.com/package/${name}/v/${main.version}`
        }
    });
})