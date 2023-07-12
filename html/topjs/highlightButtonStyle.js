var highlightButton = (target, colorScheme=currentColorScheme) => {
    const targetColor = colorScheme.light
    console.log(`Setting background color of ${target} to ${targetColor.r}, ${targetColor.g}, ${targetColor.b}`)
    target.style.backgroundColor = `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})`;
}

var filterFunc = (target) => {
    if(target.classList.contains('btn') && target.classList.contains('highlight')) highlightButton(target);
}

var searchHighlights = (node) => {
    if(node.childNodes) node.childNodes.forEach(searchHighlights);
    if(node && node.classList && node.classList.contains('btn') && node.classList.contains('highlight')) filterFunc(node);
};

if(typeof highlightObserver == `undefined`) {
    var highlightObserver = new MutationObserver(mutations => {
        if(mutations.target) searchHighlights(mutations.target)
    });
    
    highlightObserver.observe(document, {
        subtree: true,
        attributes: true
    });
}

if(document.body) searchHighlights(document.body);