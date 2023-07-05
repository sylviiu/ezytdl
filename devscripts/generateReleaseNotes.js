const fs = require(`fs`);
const child_process = require(`child_process`);

const daysOfTheWeek = [`Sun`, `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`];

const months = [`Jan`, `Feb`, `Mar`, `Apr`, `May`, `Jun`, `Jul`, `Aug`, `Sep`, `Oct`, `Nov`, `Dec`]

const args = process.argv.slice(2);

const type = args.shift();

const tagList = child_process.execSync(`git tag --sort=-creatordate`).toString().trim().split(`\n`).map(s => s.trim());
const latestReleaseTag = tagList[0];
const latestStableTag = tagList.filter(s => !s.includes(`-nightly`))[0];
const previousTagCommit = child_process.execSync(`git rev-list -n 1 ${tagList.filter(s => !s.includes(`-nightly`))[0]}`).toString().trim();
const currentCommit = child_process.execSync(`git rev-parse HEAD`).toString().trim();

console.log(`latest release tag: ${latestReleaseTag} -- latest stable tag: ${latestStableTag}`)

const variables = {
    version: require(`../package.json`).version,
    releaseTitle: process.env["RELEASE_TITLE"] || null,
    commitList: child_process.execSync(`git log ${previousTagCommit}...${currentCommit}`).toString().trim().slice(7).split(`\n\ncommit `).map(s => {
        const hash = s.split(`\n`)[0];
        const hashLink = `[**${hash.slice(0, 7)}**](https://github.com/sylviiu/ezytdl/commit/${hash})`;
        //console.log(hashLink);
    
        const author = s.split(`\n`)[1].trim().split(`: `).slice(1).join(`:`);
    
        const date = new Date(s.split(`\n`)[2].split(`:`).slice(1).join(`:`).trim())
        const hour = date.getUTCHours().toString().length == 1 ? `0${date.getUTCHours()}` : date.getUTCHours()
        const min = date.getUTCMinutes().toString().length == 1 ? `0${date.getUTCMinutes()}` : date.getUTCMinutes()
        const sec = date.getUTCSeconds().toString().length == 1 ? `0${date.getUTCSeconds()}` : date.getUTCSeconds()
        const dateStr = `${daysOfTheWeek[date.getUTCDay()]}, ${date.getUTCDate()} ${months[date.getUTCMonth()]}, ${date.getUTCFullYear()} @ ${hour}:${min}:${sec} UTC`
        //console.log(dateStr)
    
        const parsed = `> - ${author}: ${hashLink} / ${dateStr}\n> \n> ${s.split(`\n`).slice(4).map(s => s.trim()).join(`\n> `)}\n`;
    
        return parsed;
    }).join(`\n`)
};

if(fs.existsSync(`./res/releaseNotes/${type}.md`)) {
    const variableRegex = /{([^}]+)}/g;

    let processed = fs.readFileSync(`./res/releaseNotes/${type}.md`).toString().replace(variableRegex, (match, key) => variables[key] || match);

    if(processed.match(variableRegex)) throw new Error(`Failed to replace all variables! Missing:` + processed.match(variableRegex).map(s => `\n- Missing ${s.slice(1, -1)} -- got ${variables[s.slice(1, -1)]}`).join(``))

    if(args.length > 0) {
        processed = processed.split(`--------------`)[0] + `--------------\n\n### Release Notes\n\n${args.join(` `)}\n\n--------------\n\n` + processed.split(`--------------`)[1]
    }

    fs.writeFileSync(`./release-notes.md`, processed)
} else console.error(`No release notes template found for type "${type}"!`)