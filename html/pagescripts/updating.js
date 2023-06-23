document.querySelectorAll(`.btn`).forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = 0.5;
});

const progressBar = addProgressBar(document.getElementById(`div`), `315px`, `20px`);

const heading = document.getElementById(`heading`);

const homeButton = document.getElementById(`homeButton`);

const percentageText = document.getElementById(`percentageText`);

update.event((m) => {
    if(m.complete) {
        console.log(`WS CLOSED`);

        homeButton.disabled = false
        homeButton.style.opacity = 1;
        homeButton.classList.replace(`d-none`, `d-flex`);
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

update.download(`${window.location.search ? window.location.search.slice(1).slice(0, -1) : `pybridge`}`)