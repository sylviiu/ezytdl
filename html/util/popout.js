const popout = (originalCard, deleteOriginal) => {
    const currentPosition = originalCard.getBoundingClientRect();

    console.log(`popout current pos`, currentPosition)

    const card = originalCard.cloneNode(true);

    card.opacity = 1;
    card.style.opacity = 1;

    card.id += `-clone`;

    card.style.position = `fixed`;

    const originalCardValues = removeElements(originalCard, {padding: true})

    card.style.left = `${currentPosition.x}px`;
    card.style.top = `${currentPosition.y}px`;

    card.style.width = currentPosition.width + `px`;
    card.style.maxWidth = currentPosition.width + `px`;
    card.style.height = currentPosition.height + `px`;
    card.style.maxHeight = currentPosition.height + `px`;
    
    //card.parentNode.removeChild(card);
    document.body.appendChild(card);

    if(deleteOriginal) {
        originalCard.parentNode.removeChild(originalCard);
    } else {
        originalCard.style.opacity = 0;
    }

    return card;
}