const button = document.getElementById(`button`).cloneNode(true);
const input = document.getElementById(`inputText`).cloneNode(true);
document.getElementById(`inputText`).remove();
document.getElementById(`button`).parentNode.removeChild(document.getElementById(`button`));

const str = `${window.location.search ? window.location.search.slice(1) : `dialog`}`;

const mkdown = new showdown.Converter({ parseImgDimensions: true });

dialog.get(str).then(content => {
    document.getElementById(`title`).innerHTML = content.title;
    document.getElementById(`content`).innerHTML = mkdown.makeHtml(content.body);

    if(content.inputs) content.inputs.forEach(inputContent => {
        const inp = input.cloneNode(true);
        inp.placeholder = inputContent.text;
        if(inputContent.id) inp.id = inputContent.id;

        inp.classList.remove(`d-none`)

        document.getElementById(`inputs`).appendChild(inp);
    });

    if(content.buttons) content.buttons.forEach(btnContent => {
        const btn = button.cloneNode(true);
        btn.querySelector(`#txt`).innerHTML = btnContent.text;
        btn.onclick = () => dialog.send(str, btnContent.id, content.inputs ? Array.from(document.getElementById(`inputs`).childNodes).filter(f => f.id).map(inp => ({id: inp.id, value: inp.value})) : undefined);

        if(btnContent.primary) {
            btn.style.background = `white`;
            btn.style.color = `black`;
        }

        console.log(btnContent);
        
        if(!btnContent.icon && btnContent.primary) btnContent.icon = `check`;

        const icon = btn.querySelector(`#${btnContent.icon}`)
        console.log(btnContent.icon, btnContent.icon, icon, btn.childNodes)
        if(icon) icon.classList.remove(`d-none`);

        document.getElementById(`buttons`).appendChild(btn);
    });

    dialog.setHeight(str, document.getElementById(`contentDiv`).getBoundingClientRect().height + 20)

    console.log(content)
});