const _objToListItem = (k, v, depth=0) => {
    const li = document.createElement(`li`);

    li.style.fontSize = `${1.2 - (Math.min(0.4, depth*0.2))}em`;
    li.style.display = `flex`;
    //li.style.alignItems = `center`;

    const kv = k && !v?.hideKey && `${k}: ` || ``;

    if(typeof v == `object`) {
        li.innerHTML += objToDOM(k, v, depth+1, true).innerHTML;
    } else if(typeof v == `object` && typeof v.value == `string`) {
        const icon2 = v.icon && faIconExists(depth && [`far`, `fas`, `fab`], v.icon, true, { marginRight: `${5 - Math.min(0.12, depth*0.06)}px` });
        if(icon2) li.prepend(icon2);
        li.innerHTML += markdown.makeHtml(kv + `${v.value}`).split(`>`).slice(1).join(`>`).split(`<`).slice(0, -1).join(`<`);
    } else {
        li.innerHTML += markdown.makeHtml(kv + `${v}`).split(`>`).slice(1).join(`>`).split(`<`).slice(0, -1).join(`<`);
    }

    return li;
}

const objToDOM = (name, obj, depth=0, paragraphHeading) => {
    console.log(`objToDOM: ${name} (depth ${depth}) (${typeof obj})`, obj, name)

    const dom = document.createElement(`div`);

    let heading = !paragraphHeading && document.createElement(depth > 99 ? `h6` : `h${Math.min(4, (1*depth) + 2)}`);
    if(heading) {
        if(name) heading.innerText = name;
        dom.appendChild(heading);
    }

    const p = document.createElement(`p`);
    p.style.marginBottom = `0px`;
    if(!heading) heading = p;

    if(obj.value && typeof obj.value == `string`) {
        heading.innerHTML += markdown.makeHtml((!name || !paragraphHeading ? `` : `${name}: `) + obj.value).split(`>`).slice(1).join(`>`).split(`<`).slice(0, -1).join(`<`);
        //heading.innerHTML += objToDOM(null, obj.value, depth+1, true).innerHTML;
    } else if(obj.value && typeof obj.value == `object`) {
        const ul = document.createElement(`ul`);
        Object.entries(obj.value).forEach(([k, v]) => ul.appendChild(_objToListItem(k, v, depth)))
        p.appendChild(ul);
    }

    const icon = obj.icon && faIconExists(depth && [`far`, `fas`, `fab`], obj.icon, true, { marginRight: `8px` });
    if(icon) (paragraphHeading && dom || name && heading || p).prepend(icon);
    
    if(typeof obj.expanded == `object`) {
        const details = document.createElement(`details`);

        const summary = document.createElement(`summary`);
        summary.style.display = `flex`;
        summary.style.alignItems = `center`;

        summary.appendChild(icon);
        summary.appendChild(p);
        details.appendChild(summary);

        const ul = document.createElement(`ul`);
        Object.entries(obj.expanded).forEach(([k, v]) => ul.appendChild(_objToListItem(k, v, depth)))
        details.appendChild(ul);

        console.log(`objToDOM: details`, obj, details)

        dom.appendChild(details);
    } else {
        console.log(`objToDOM: p`, obj, p)

        dom.appendChild(p);
    };

    return dom;
};