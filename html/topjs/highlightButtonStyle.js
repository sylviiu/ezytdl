const highlightButton = (target) => {
    const targetColor = systemColors.light
    console.log(`Setting background color of ${target} to ${targetColor.r}, ${targetColor.g}, ${targetColor.b}`)
    target.style.backgroundColor = `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})`;
}

const filterFunc = (target) => {
    if(target.classList.contains('btn') && target.classList.contains('highlight')) highlightButton(target);
}

const searchHighlights = (node) => {
    if(node.childNodes) node.childNodes.forEach(searchHighlights);
    if(node && node.classList && node.classList.contains('btn') && node.classList.contains('highlight')) filterFunc(node);
};

const highlightObserver = new MutationObserver(mutations => {
    if(mutations.target) searchHighlights(mutations.target)
    /*mutations.forEach(mutation => {
        const modify = mutation.target.classList.contains('btn') && mutation.target.classList.contains('highlight')
        if(modify) filterFunc(mutation.target);
    });*/
});

highlightObserver.observe(document, {
    subtree: true,
    attributes: true
});

if(document.body) searchHighlights(document.body);