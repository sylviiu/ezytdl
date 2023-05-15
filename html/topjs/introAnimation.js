if(window.location.search.slice(1) == (`introAnimation`)) {
    console.log(`intro anim`);

    history.pushState({ page: 1 }, "introAnimation", window.location.href.split(`?`)[0]);

    addEventListener(`DOMContentLoaded`, () => {
        document.body.style.opacity = 0;

        const navigationBar = document.querySelector(`#navigationBar`);
        const everythingElse = document.querySelectorAll(`body > div:not(#navigationBar)`);
    
        anime({
            targets: navigationBar,
            top: [`0px`, navigationBar.style.top],
            duration: 1500,
            easing: `easeOutExpo`,
        });
        
        everythingElse.forEach(element => anime({
            targets: element,
            //scale: [0, 1],
            marginTop: [`500vh`, element.style.marginTop || `0px`],
            duration: 2500,
            easing: `easeOutExpo`,
            complete: () => {
                console.log(`done`)
            }
        }));
        
        document.body.style.opacity = 1;
    })
} else console.log(`no intro anim`, window.location)