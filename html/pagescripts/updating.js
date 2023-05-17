document.querySelectorAll(`.btn`).forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = 0.5;
})

const bar = document.getElementById(`progressBar`);
const fill = document.getElementById(`progressFill`);

const heading = document.getElementById(`heading`);

const homeButton = document.getElementById(`homeButton`);

const dotSize = Number.parseInt(fill.style.width.replace(`px`, ``));
const range = Number.parseInt(bar.style.width.replace(`px`, ``)) - dotSize;

const percentageText = document.getElementById(`percentageText`);

update.event((m) => {
    if(m.complete) {
        console.log(`WS CLOSED`);

        homeButton.disabled = false
        homeButton.style.opacity = 1;
        homeButton.classList.replace(`d-none`, `d-flex`);
        bar.classList.add(`d-none`)
    } else {
        if(m.message) {
            heading.innerHTML = m.message
        }
        
        const percent = `${Math.round(m.progress * 100)}%`

        percentageText.innerHTML = m.version + ` / ` + percent;

        const setWidth = `${dotSize + (range * m.progress)}px`;

        console.log(`Downloaded ${percent} -- bar width: ${setWidth}`)

        fill.style.width = setWidth
    }
});

update.download(`${window.location.search ? window.location.search.slice(1).slice(0, -1) : `ytdlp`}`)