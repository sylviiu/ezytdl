const popout = (originalCard, deleteOriginal, { anchorRight = false, anchorBottom = false, addToBody=true }={}, removeElementsOpt={}) => {
    const currentPosition = originalCard.getBoundingClientRect();

    console.log(`popout current pos`, currentPosition)

    const card = originalCard.cloneNode(true);

    card.opacity = 1;
    card.style.opacity = 1;

    card.id += `-clone`;

    card.style.position = `fixed`;

    const originalCardValues = removeElements(card, Object.assign({ padding: true }, removeElementsOpt));

    if(anchorBottom) {
        card.style.bottom = `${window.innerHeight - currentPosition.y - currentPosition.height}px`
    } else {
        card.style.top = `${currentPosition.y}px`;
    };

    if(anchorRight) {
        card.style.right = `${window.innerWidth - currentPosition.x - currentPosition.width}px`;
    } else {
        card.style.left = `${currentPosition.x}px`;
    };

    card.style.width = currentPosition.width + `px`;
    card.style.maxWidth = currentPosition.width + `px`;
    card.style.height = currentPosition.height + `px`;
    card.style.maxHeight = currentPosition.height + `px`;
    
    //card.parentNode.removeChild(card);
    if(addToBody) document.body.appendChild(card);

    if(deleteOriginal) {
        originalCard.parentNode.removeChild(originalCard);
    } else {
        originalCard.style.opacity = 0;
    }

    return card;
}