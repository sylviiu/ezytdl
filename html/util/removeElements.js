const removeElements = (card, opt) => {
    const current = {
        width: card.offsetWidth,
        height: card.offsetHeight,
    };

    if(opt == true) opt == {margin: true, padding: true};

    const { margin, padding } = opt;

    card.style.removeProperty(`max-width`);
    card.style.removeProperty(`min-width`);
    card.style.removeProperty(`min-height`);
    card.style.removeProperty(`max-height`);

    card.style.removeProperty(`width`);
    card.style.removeProperty(`height`);

    if(margin) {
        card.style.removeProperty(`margin`);
        card.style.removeProperty(`margin-top`);
        card.style.removeProperty(`margin-left`);
        card.style.removeProperty(`margin-right`);
        card.style.removeProperty(`margin-bottom`);
    }

    if(padding) {
        card.style.removeProperty(`padding`);
        card.style.removeProperty(`padding-bottom`);
        card.style.removeProperty(`padding-left`);
        card.style.removeProperty(`padding-right`);
        card.style.removeProperty(`padding-top`);
    }

    return current;
}