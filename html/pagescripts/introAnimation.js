console.log(`introAnimation called`);

document.body.style.opacity = 0;

const enableUpdateButton = () => {
    document.getElementById(`updateAvailable`).classList.add(`d-flex`);
    document.getElementById(`updateAvailable`).classList.remove(`d-none`);
    document.getElementById(`updateAvailable`).onclick = () => version.openUpdatePage()
}

let givenCB;

const callback = () => {
    if(givenCB) givenCB();
}

const introAnimation = {
    wait: (cb) => givenCB = cb
}

const htmlFile = window.location.search.slice(1) || `index.html`
const path = `./${htmlFile}`

history.pushState({ page: 1 }, "introAnimation", htmlFile);

const ajax = new XMLHttpRequest();
ajax.open(`GET`, path, true);
console.log(path);

ajax.onload = async () => {
    console.log(ajax.responseText);

    const h = document.createElement(`html`);
    h.innerHTML = ajax.responseText;
    
    h.querySelector(`body`).style.opacity = 0;

    for (node of h.querySelectorAll(`head > *`)) {
        document.head.appendChild(node);
    }

    searchHighlights(h.querySelector(`body`));

    document.body = h.querySelector(`body`);
    
    await system.addScript(`./pagescripts/${htmlFile.split(`.`).slice(0, -1).join(`.`)}.js`)
    await system.addScript(`./topjs/feelLikeNativeApp.js`)
    await system.addScript(`./topjs/vars.js`)
    await system.addScript(`./afterload/downloadManager.js`)
    
    console.log(`loaded scripts!`);

    callback();

    if(typeof getVersion != `undefined`) getVersion()
    initDownloadManager();

    const enableUpdateButton = () => {
        document.getElementById(`updateAvailable`).classList.add(`d-flex`);
        document.getElementById(`updateAvailable`).classList.remove(`d-none`);
        document.getElementById(`updateAvailable`).onclick = () => send(`openUpdatePage`)
    }

    if(document.getElementById(`updateAvailable`)) {
        console.log(`updateAvailable Enabled`)
        version.checkForUpdates().then(r => r ? enableUpdateButton() : null);
        version.onUpdate(enableUpdateButton)
    }

    const navigationBar = document.body.querySelector(`#navigationBar`);
    const everythingElse = document.body.querySelectorAll(`body > div:not(#navigationBar)`);

    if(config.disableAnimations) {
        document.body.style.opacity = 1;
    } else if(config.reduceAnimations) {
        anime({
            targets: document.body,
            opacity: [0, 1],
            duration: 1500,
            easing: `easeOutExpo`,
        })
    } else {
        anime({
            targets: navigationBar,
            top: [`0px`, navigationBar.style.top],
            duration: 1500,
            begin: () => {
                document.body.style.opacity = 1;
            },
            easing: `easeOutExpo`,
        });
        
        everythingElse.forEach(element => anime({
            targets: element,
            //scale: [0, 1],
            marginTop: [`500vh`, element.style.marginTop || `0px`],
            duration: 2500,
            easing: `easeOutExpo`,
            begin: () => {
                document.body.style.opacity = 1;
            },
            complete: () => {
                console.log(`done`)
            }
        }));
    }
};

ajax.send();