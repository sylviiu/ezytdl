const searchTags = [];

const searchTagsEditHook = [];

const searchTagsEditCallback = (container, cb) => searchTagsEditHook.push({cb, container});

const createSearchTag = ({content, url, name}) => {
    const tagsDiv = (content || currentContent).querySelector("#tags");

    if(tagsDiv) {
        const existingTag = searchTags.find(o => o.getAttribute(`title`) == url);

        if(existingTag) {
            console.log(`Tag already exists! (${url})`, existingTag);

            buttonDisabledAnim(existingTag);

            return existingTag;
        } else {
            const thisTag = tagButton.cloneNode(true);
    
            thisTag.setAttribute(`title`, url)
    
            thisTag.container = (content || currentContent);
    
            thisTag.innerHTML = thisTag.innerHTML.replace(`URL`, name || url);
    
            thisTag.onclick = (e, i) => {
                thisTag.onclick = () => {};
    
                searchTags.splice(searchTags.findIndex(o => o == thisTag), 1);
    
                thisTag.id += `-removed`
    
                const { width, height } = thisTag.getBoundingClientRect();
    
                const easing = (typeof i == `number` ? `easeInOutExpo` : `easeOutExpo`);
    
                anime({
                    targets: thisTag,
                    opacity: 0,
                    width: [width, 0],
                    maxWidth: [width, 0],
                    height: [height, 0],
                    maxHeight: [height, 0],
                    paddingLeft: [12, 0],
                    paddingRight: [12, 0],
                    marginLeft: [6, 0],
                    duration: 600,
                    delay: typeof i == `number` ? 25 * i : 0,
                    easing,
                    complete: () => thisTag.parentElement.removeChild(thisTag)
                });
    
                if(typeof i != `number`) searchTagsEditHook.filter(({container}) => container == (content || currentContent)).forEach(({ cb }) => cb());
            };
    
            searchTags.push(thisTag);
            
            anime({
                targets: thisTag,
                scale: [0, 1],
                duration: 800,
                easing: `easeOutExpo`,
                begin: () => tagsDiv.appendChild(thisTag),
            })
            
            searchTagsEditHook.filter(({container}) => container == (content || currentContent)).forEach(({ cb }) => cb());
    
            return thisTag;
        }
    } else return null;
};

const clearSearchTags = (content) => {
    searchTags.slice(0).filter(o => o.container == (content || currentContent)).forEach((tag, i) => tag.onclick(null, i));
    if(typeof i != `number`) searchTagsEditHook.filter(({container}) => container == (content || currentContent)).forEach(({ cb }) => cb());
};

const getSearchTags = (content) => {
    return searchTags.filter(o => o.container == (content || currentContent)).map(o => o.getAttribute(`title`) || o.innerHTML.split(`>`).slice(-1)[0]);
}