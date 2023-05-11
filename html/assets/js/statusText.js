if(document.getElementById(`statusText`)) {
    const txt = document.getElementById(`statusText`);

    const statusWs = new WebSocket(`ws://localhost:3000/download`);

    statusWs.onopen = () => {
        statusWs.send(`status`)
    }

    statusWs.onmessage = (e) => {
        if(!txt.classList.contains(`d-none`)) {
            txt.innerHTML = e.data;
        }
    }
}