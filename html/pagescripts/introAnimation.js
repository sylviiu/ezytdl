console.log(`introAnimation called`);

document.body.style.opacity = 0;

let givenCB = [];

let complete = false;

const callback = () => {
    complete = true;
    console.log(`introAnimation -- calling back ${givenCB.length} functions`)
    givenCB.forEach(c => c())
}

const introAnimation = {
    wait: (cb) => typeof cb == `function` ? complete ? cb() : givenCB.push(cb) : false
};

const updateBridge = window.location.search.slice(1) == `updateBridge`

const htmlFile = window.location.search.slice(1) == `updateBridge` ? `index.html` : window.location.search.slice(1) || `index.html`
const path = `./${htmlFile}`

history.pushState({ page: 1 }, "introAnimation", htmlFile);

const ajax = new XMLHttpRequest();
ajax.open(`GET`, path, true);
console.log(path);

ajax.onload = async () => {
    console.log(ajax.responseText);

    const h = document.createElement(`html`);
    h.innerHTML = ajax.responseText;
    
    for (node of h.querySelectorAll(`head > *`)) {
        document.head.appendChild(node);
    }

    const finish = () => new Promise(async res => {
        h.querySelector(`body`).style.opacity = 0;

        searchHighlights(h.querySelector(`body`));
    
        document.body = h.querySelector(`body`);

        await system.addScript(`./topjs/tweaks.js`)
        await system.addScript(`./topjs/vars.js`)
        //await system.addScript(`./pagescripts/${htmlFile.split(`.`).slice(0, -1).join(`.`)}.js`)
        await scripts.pagescript(htmlFile.split(`.`).slice(0, -1).join(`.`))
        await scripts.afterload();
    
        if(typeof getVersion != `undefined`) getVersion()
        initDownloadManager();
        
        console.log(`loaded scripts!`);
    
        const navigationBar = document.body.querySelector(`#navigationBar`);
        const everythingElse = document.body.querySelectorAll(`body > div:not(#navigationBar)`);
    
        if(config.disableAnimations) {
            document.body.style.opacity = 1;
            if(!updateBridge) callback();
            res();
        } else if(config.reduceAnimations) {
            const a = anime({
                targets: document.body,
                opacity: [0, 1],
                duration: 1500,
                easing: `easeOutExpo`,
                begin: () => {
                    if(!updateBridge) callback();
                },
                complete: () => res(),
            }); a._onDocumentVisibility = () => {};
            if(updateBridge) setTimeout(() => res(), 500);
        } else {
            const a = anime({
                targets: navigationBar,
                top: [`0px`, navigationBar.style.top],
                duration: 1500,
                begin: () => {
                    document.body.style.opacity = 1;
                },
                complete: () => res(),
                easing: `easeOutExpo`,
            }); a._onDocumentVisibility = () => {};

            if(updateBridge) setTimeout(() => res(), 500);
            
            everythingElse.forEach(element => anime({
                targets: element,
                //scale: [0, 1],
                marginTop: [`500vh`, element.style.marginTop || `0px`],
                duration: 2500,
                easing: `easeOutExpo`,
                begin: () => {
                    document.body.style.opacity = 1;
                    if(!updateBridge) callback();
                },
                complete: () => {
                    console.log(`done`);
                    res();
                }
            }));
        }
    });

    if(updateBridge) {
        console.log(`updateBridge`);

        const popout = createPopout({
            buttons: [
                {
                    element: h.querySelector(`#urlBox`),
                    href: `updating.html`
                }
            ],
            closeOnNavigate: true,
            addEventListeners: false,
            updatePosition: true,
            //completeHook: () => callback()
            overlayCompleteHook: () => {
                if(document.querySelector(`#everythingContainer`)) anime({
                    targets: document.querySelector(`#everythingContainer`),
                    opacity: 0,
                    duration: 350,
                    easing: `easeInCirc`,
                    complete: () => window.location.href = `introAnimation.html?${htmlFile}`
                })
            },
            completeHook: () => {
                if(popout.divs.overlayDiv) {
                    anime({
                        targets: popout.divs.overlayDiv,
                        opacity: 0,
                        duration: 350,
                        easing: `easeInCirc`,
                        complete: () => window.location.href = `introAnimation.html?${htmlFile}`
                    })
                } else window.location.href = `introAnimation.html?${htmlFile}`
            }
        });

        let inProgress = true;

        update.event(m => {
            if(m.complete) inProgress = false;
            popout.setCloseable(!inProgress);
        });

        popout.setCloseable(false);

        finish().then(() => {
            popout.buttons[0].click();
        });
    } else {
        finish();
    }
};

ajax.send();