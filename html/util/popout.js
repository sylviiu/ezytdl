const popout = (originalCard) => {
    const card = originalCard.cloneNode(true);

    card.opacity = 1;
    card.style.opacity = 1;

    card.id += `-clone`;

    card.style.position = `fixed`;

    const currentPosition = originalCard.getBoundingClientRect();

    const originalCardValues = removeElements(originalCard, {padding: true})

    card.style.left = `${currentPosition.x}px`;
    card.style.top = `${currentPosition.y}px`;
    
    //card.parentNode.removeChild(card);
    document.body.appendChild(card);

    originalCard.style.opacity = 0;

    return card;
}