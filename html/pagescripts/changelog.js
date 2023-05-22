const heading = document.getElementById(`heading`);
const released = document.getElementById(`released`);
const contentBody = document.getElementById(`content`);

const converter = new showdown.Converter({ parseImgDimensions: true });

changelog.get().then(content => {
    console.log(content)

    const updateReleasedTime = () => {
        const d = new Date(content.released);

        const timeSinceReleased = new Date(Date.now() - d.getTime());

        const months = timeSinceReleased.getUTCMonth();
        const days = timeSinceReleased.getUTCDate() - 1;
        const hours = timeSinceReleased.getUTCHours();
        const minutes = timeSinceReleased.getUTCMinutes();

        const arr = []

        if(months > 0) arr.push(`${months} month${months > 1 ? `s` : ``}`)
        if(days > 0) arr.push(`${days} day${days > 1 ? `s` : ``}`)
        if(hours > 0) arr.push(`${hours} hour${hours > 1 ? `s` : ``}`)
        if(minutes > 0 || arr.length == 0) arr.push(`${minutes} minute${minutes > 1 ? `s` : ``}`)

        if(arr.length > 1) {
            released.innerHTML = `released ${arr.slice(0, -1).join(`, `)} and ${arr.slice(-1)} ago`;
        } else {
            released.innerHTML = `released ${arr[0]} ago`;
        }
    }

    heading.innerHTML = `v${content.version}`;

    let b = content.body.split(`\n`);

    for (i in b) {
        let str = b[i];

        if(str.startsWith(`![`) && str.includes(`[`) && str.includes(`]`) && str.includes(`(`) && str.includes(`)`)) {
            b[i] = str.split(`)`).slice(0, -1).join(`)`) + ` =90%x*)` + str.split(`)`).slice(-1)[0]
        }
    };

    if(content.url) {
        document.getElementById(`githubReleaseButton`).href = content.url
    } else {
        document.getElementById(`githubReleaseButton`).opacity = 0.5;
        document.getElementById(`githubReleaseButton`).disabled = true;
    }

    contentBody.innerHTML = converter.makeHtml(b.join(`\n`))

    setInterval(updateReleasedTime, 1000); updateReleasedTime();

    heading.classList.remove(`d-none`);
    released.classList.remove(`d-none`);
    contentBody.classList.remove(`d-none`);
})