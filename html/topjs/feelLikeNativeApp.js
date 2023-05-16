// just disable text selecting and disable link mouse changing and stuff

addEventListener(`DOMContentLoaded`, () => {
    document.body.style.userSelect = `none`;
    
    const makeButton = (btn) => {
        btn.style.cursor = `default`;
        btn.style[`-webkit-app-region`] = `no-drag`;
        const children = [];
        btn.childNodes.forEach(n => { if(n && n.style) children.push(n) })
        btn.onmouseover = () => {
            anime.remove(children)
            anime({
                targets: children,
                scale: 1.2,
                duration: 500,
                easing: `easeOutExpo`
            })
        };
        btn.onmouseout = () => {
            anime.remove(children)
            anime({
                targets: children,
                scale: 1,
                duration: 500,
                easing: `easeOutExpo`
            })
        }
    }

    if(document.getElementById(`navigationBar`)) {
        document.querySelectorAll(`#navigationBar .btn`).forEach(makeButton);
        
        if(document.getElementById(`windowControls`)) {
            console.log(`windowControls present`);
            if(navigator.platform == `Win32` || navigator.platform.indexOf(`Mac`) === 0) {        
                document.getElementById(`minimizeWindows`).onclick = () => windowControls.minimize();
                document.getElementById(`maximizeWindows`).onclick = () => windowControls.maximize();
                document.getElementById(`closeWindows`).onclick = () => windowControls.close();
        
                document.getElementById(`navigationBar`).style[`-webkit-app-region`] = `drag`;
        
                const disableDrag = (node) => {
                    if(node.childNodes) node.childNodes.forEach(n => disableDrag(n));
                    if(node && node.classList && node.classList.contains(`btn`)) node.style[`-webkit-app-region`] = `no-drag`;
                }
        
                document.getElementById(`navigationBar`).childNodes.forEach(element => disableDrag(element))
            } else {
                document.getElementById(`windowControls`).classList.add(`d-none`)
            }
        }
    } else {
        //if(navigator.platform == `Win32` || navigator.platform.indexOf(`Mac`) === 0) document.body.style[`-webkit-app-region`] = `drag`;
        //document.body.querySelectorAll(`.btn`).forEach(makeButton);
    }
});