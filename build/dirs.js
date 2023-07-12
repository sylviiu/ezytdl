const fs = require('fs');

const blacklistedDirs = [`assets`];

const dirs = fs.readdirSync(`./html`).filter(f => !f.endsWith(`.html`) && blacklistedDirs.indexOf(f) === -1).map(f => ({ path: `./html/${f}`, files: fs.readdirSync(`./html/${f}`).filter(f2 => f2.endsWith(`.js`)) }));

module.exports = dirs;