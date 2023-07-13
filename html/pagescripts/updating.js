document.querySelectorAll(`.btn`).forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = 0.5;
});

let noClose = true;

const progressBar = addProgressBar(document.getElementById(`div`), `315px`, `20px`);

const heading = document.getElementById(`heading`);

const homeButton = document.getElementById(`homeButton`);

const percentageText = document.getElementById(`percentageText`);

const systemUpdate = useWindow.update

systemUpdate.event((m) => {
    console.log(`updatestr event: ${JSON.stringify(m, null, 4)}`)

    if(m.complete) {
        console.log(`WS CLOSED`);

        noClose = false;

        homeButton.disabled = false
        homeButton.style.opacity = 1;
        homeButton.classList.replace(`d-none`, `d-flex`);
        /*if(typeof useHref == `boolean` && useHref) {
            console.log(`using href: ${homeButton.getAttribute(`href`)}`)
        } else {
            console.log(`not using href`)
            const href = homeButton.getAttribute(`href`);
            homeButton.removeAttribute(`href`);
            homeButton.onclick = () => {
                anime({
                    targets: document.getElementById(`div`),
                    scale: 1.5,
                    opacity: 0,
                    duration: 150,
                    easing: `easeInCirc`,
                    complete: () => {
                        window.location.href = `introAnimation.html?` + typeof parentUpdate == `undefined` ? `index.html` : `settings.html`
                    }
                })
            }
        }*/
        console.log(`using href: ${homeButton.getAttribute(`href`)}`)
        progressBar.remove();
    } else {
        if(m.message) {
            heading.innerHTML = m.message
        }

        percentageText.innerHTML = ``;

        if(m.progress) {
            progressBar.setProgress(m.progress * 100);
        };

        if(m.progress && m.progress > 0) {
            if(!percentageText.innerHTML) percentageText.innerHTML += `${Math.round(m.progress * 100)}%`;
        };

        if(m.version) {
            if(!percentageText.innerHTML) {
                percentageText.innerHTML += m.version;
            } else percentageText.innerHTML += ` / ` + m.version;
        }
    }
});

const updateStr = `${window.location.search ? window.location.search.slice(1).slice(0, -1) : `pybridge`}`;

console.log(`updateStr: ${updateStr}`)

systemUpdate.download(updateStr)