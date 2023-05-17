const mainTargets = [document.getElementById(`loading`), document.getElementById(`icon`)];

anime({
    targets: mainTargets,
    //marginTop: [`100vh`, `0`],
    opacity: [0, 1],
    duration: 1000,
    easing: `easeOutExpo`,
    delay: anime.stagger(100)
})

system.loading().then(link => {
    console.log(`done loading`)

    console.log(link)

    const newDiv = document.createElement(`div`);
    newDiv.style.background = document.body.style.background;
    newDiv.style.minWidth = `100vw`;
    newDiv.style.minHeight = `100vh`;
    newDiv.style.position = `absolute`;
    newDiv.style.top = `0`;
    newDiv.style.left = `0`;
    newDiv.style.opacity = 0;
    document.body.appendChild(newDiv);

    anime({
        targets: document.querySelector(`#loadingDiv`),
        scale: 1.35,
        easing: `easeInExpo`,
        duration: 300,
    })

    anime({
        targets: newDiv,
        opacity: 1,
        duration: 250,
        easing: `easeInExpo`,
        complete: () => window.location.href = `introAnimation.html` + `?` + (link || `index.html`)
    })
})