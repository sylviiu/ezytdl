const removeCardAnim = (card, removeEntry) => {
    if(card.querySelector(`#pausePlayButton`)) card.querySelector(`#pausePlayButton`).onclick = () => {};

    if(typeof removeEntry == `function`) removeEntry();

    const currentHeight = card.getBoundingClientRect().height;

    anime({
        targets: card,
        maxHeight: [currentHeight, 0],
        height: [currentHeight, 0],
        opacity: [1, 0],
        minHeight: [currentHeight, 0],
        padding: [12, 0],
        marginTop: [12, 0],
        scaleY: [1, 0],
        duration: 1000,
        easing: `easeOutExpo`,
        complete: () => card.parentElement.removeChild(card)
    })
}