// designated for linux

const type = process.argv.shift();

if(type == `nightly`) {
    const fs = require(`fs`);
    const child_process = require(`child_process`);
    
    const commits = child_process.execSync(`git log $(git rev-list -n 1 $(git describe --tags --abbrev=0))...$(git rev-parse HEAD)`, {shell: `/bin/bash`}).toString().trim();
    
    const daysOfTheWeek = [`Sun`, `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`];
    
    const months = [`Jan`, `Feb`, `Mar`, `Apr`, `May`, `Jun`, `Jul`, `Aug`, `Sep`, `Oct`, `Nov`, `Dec`]
    
    const str = commits.slice(7).split(`\n\ncommit `).map(s => {
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
    });
    
    console.log(str);

    let processed = fs.readFileSync(`./res/releaseNotes/nightly.md`).toString() + str.join(`\n`)

    if(process.argv.length > 0) {
        processed = processed.split(`--------------`)[0] + `--------------\n\n### Release Notes\n\n${process.argv.join(` `)}\n\n--------------\n\n` + processed.split(`--------------`)[1]
    }
    
    fs.writeFileSync(`./release-notes.md`, processed)
}