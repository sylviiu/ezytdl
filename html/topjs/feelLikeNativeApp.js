// just disable text selecting and disable link mouse changing and stuff

addEventListener(`DOMContentLoaded`, () => {
    document.body.style.userSelect = `none`;

    if(navigator.platform == `Win32` && document.getElementById(`windowControls`)) {
        const winControls = document.getElementById(`windowControls`);
        winControls.classList.remove(`d-none`);
        winControls.classList.add(`d-flex`);

        document.getElementById(`minimizeWindows`).onclick = () => windowControls.minimize();
        document.getElementById(`maximizeWindows`).onclick = () => windowControls.maximize();
        document.getElementById(`closeWindows`).onclick = () => windowControls.close();

        document.getElementById(`navigationBar`).style[`-webkit-app-region`] = `drag`;

        const disableDrag = (node) => {
            if(node.childNodes) node.childNodes.forEach(n => disableDrag(n));
            if(node && node.classList && node.classList.contains(`btn`)) node.style[`-webkit-app-region`] = `no-drag`;
        }

        document.getElementById(`navigationBar`).childNodes.forEach(element => disableDrag(element))
    }
});