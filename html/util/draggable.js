const dragEasing = anime.easing('easeOutExpo');

let cloned = null;
let clonedTxt = null;

let lastDragged = null;

const clearCloned = (success, animateDrop, reanimate) => {
    const thisButton = cloned;
    cloned = null;

    const thisTxt = clonedTxt;
    clonedTxt = null;

    if(reanimate && lastDragged) {
        const thisLastDragged = lastDragged;
        lastDragged = null;
        console.log(thisLastDragged.style.opacity)
        anime({
            targets: thisLastDragged,
            scale: typeof thisLastDragged.style.opacity == `number` && thisLastDragged.style.opacity == 0 ? [0, 1] : 1,
            opacity: 1,
            left: 0,
            bottom: 0,
            duration: 500,
            easing: `easeOutExpo`
        });
    };

    const genericTxtFall = () => {
        if(thisTxt) {        
            anime.remove(thisTxt);
            anime({
                targets: thisTxt,
                marginBottom: 0,
                opacity: 0,
                duration: 500,
                easing: `easeOutExpo`,
                complete: () => {
                    if(thisTxt && thisTxt.parentNode) thisTxt.parentNode.removeChild(thisTxt);
                }
            });
        }
    }

    if(animateDrop && thisButton) {
        anime.remove(thisButton)

        if(success) {
            anime({
                targets: thisButton,
                scale: 0,
                marginBottom: 0,
                duration: 100,
                easing: `easeOutQuad`,
                complete: () => {
                    if(thisButton && thisButton.parentNode) thisButton.parentNode.removeChild(thisButton);
                }
            });

            genericTxtFall();
        } else {
            const fallAnim = (target, durationMult, opacity, maxRotationMult) => {
                const duration = parseInt(window.innerHeight) * durationMult;
                const maxRotation = (duration/540)*maxRotationMult
                const rot = (Math.random() * maxRotation)-(maxRotation/2);
    
                anime({
                    targets: target,
                    marginBottom: 0,
                    bottom: parseInt(target.style.bottom) - parseInt(window.innerHeight),
                    rotate: rot,
                    opacity,
                    duration,
                    easing: `easeInQuad`,
                    complete: () => {
                        if(target.parentNode) target.parentNode.removeChild(target);
                    }
                });
            };

            fallAnim(thisButton, 1, [1,1,0], 500);
            if(thisTxt) fallAnim(thisTxt, 1.35, [1,0,0], 250)
        }
    } else {
        genericTxtFall();
    }
};

class Draggable {
    constructor({
        node,
        targets=[],
        value=``,
        enableClickRecognition=true,
        enableDrag=true,
        reanimate=true,
        animateDrop=true,
        animateDropFail=true,
        targetScale=1.15,
        hideOriginal=true,
        hint=null,
        allowPopout=true,
        dropHook=()=>{},
        id=`${Date.now()}`
    }) {
        console.log(`new draggable started with ${node.id}`);

        if(!hint && !allowPopout) hint = `You can't drag this!`;

        let thisCloned = null;
    
        let returned = false;
    
        const returnDrop = (...val) => {
            if(!returned) {
                console.log(`returning ${node.id || id} with`, val)
                returned = true;
                dropHook(...val);
            };

            thisCloned = null;
            
            targets.forEach(target => {
                if(target.getAttribute(`currentDrop`) == node.id || target.getAttribute(`currentDrop`) == id) {
                    target.setAttribute(`currentDrop`, ``);
                    target.ondrop = null;
                }
            });
        }
    
        const focusableTargets = targets.filter(f => typeof f.focus == `function`); 
    
        const focusTarget = (target) => {
            if(!target) target = focusableTargets[0];
            if(target && typeof target.focus == `function`) target.focus();
        }
    
        if(node.getAttribute(`dragEnabled`) != `true`) {
            node.setAttribute(`dragEnabled`, `true`)
            if(enableDrag) node.setAttribute(`draggable`, `true`)
    
            let nodeBounds = null;
            let initialOffset = null;
    
            node.style.webkitUserDrag = `all`;

            const clearDrag = (success) => {
                returnDrop(success, thisCloned);
                clearCloned(success, ((success ? animateDrop : animateDropFail) || animateDrop), reanimate);
                initialOffset = null;
            };

            const startDrag = (e) => {
                if(e && e.dataTransfer) {
                    e.dataTransfer.setDragImage(new Image(), 0, 0);
                    if(!allowPopout) {
                        e.dataTransfer.effectAllowed = `none`;
                        e.dataTransfer.dropEffect = `none`;
                    } else {
                        e.dataTransfer.setData(`text`, value);
                    }
                };

                const initiateDrag = (useCloned) => {
                    anime.remove(node);
                    node.style.scale = 1;
                    nodeBounds = node.getBoundingClientRect();

                    initialOffset = null;

                    if(hint && !clonedTxt) {
                        const style = window.getComputedStyle(node);

                        clonedTxt = document.createElement(`p`);
                        clonedTxt.innerHTML = hint;
                        clonedTxt.style.position = `absolute`;
                        clonedTxt.style.opacity = 0;

                        document.body.appendChild(clonedTxt);

                        const clonedBounds = clonedTxt.getBoundingClientRect();

                        clonedTxt.style.pointerEvents = `none`;
                        clonedTxt.style.userSelect = `none`;
                        clonedTxt.style.margin = `0px`;
                        clonedTxt.style.position = `absolute`;
                        clonedTxt.style.maxWidth = clonedBounds.width + `px`;
                        clonedTxt.style.maxHeight = clonedBounds.height + `px`;
                        clonedTxt.style.left = (e.pageX - clonedBounds.width/2 - parseInt(style.marginLeft)) + `px`;
                        clonedTxt.style.bottom = (window.innerHeight - (e.pageY + clonedBounds.height/2 - parseInt(style.marginBottom))) + `px`;
                        
                        const targetMargin = (allowPopout ? ((useCloned ? cloned || node : node).getBoundingClientRect().height) : 0 * targetScale) + clonedTxt.getBoundingClientRect().height + 25;
                        
                        anime({
                            targets: clonedTxt,
                            marginBottom: [targetMargin + 50, targetMargin],
                            scale: [1.25, 1],
                            opacity: [0, 1],
                            duration: 500,
                            easing: `easeOutExpo`,
                        })
                    }
                };

                if(!thisCloned && allowPopout) {
                    targets.forEach(target => {
                        target.setAttribute(`currentDrop`, node.id || id);
                        target.ondrop = (e) => {
                            console.log(`ondrop`, e);
                
                            if(focusableTargets.length == 1) focusTarget();

                            clearDrag(true)
                        };
                    });
        
                    initiateDrag(true);
                    const style = window.getComputedStyle(node);
        
                    clearCloned(false, true, true);
    
                    lastDragged = node;
        
                    returned = false;
        
                    cloned = node.cloneNode(true);
                    thisCloned = cloned;
                    
                    cloned.setAttribute(`cloned`, `true`)
        
                    cloned.style.pointerEvents = `none`;
                    cloned.style.userSelect = `none`;
                    cloned.style.margin = `0px`;
                    cloned.style.position = `absolute`;
                    cloned.style.maxWidth = nodeBounds.width + `px`;
                    cloned.style.maxHeight = nodeBounds.height + `px`;
                    cloned.style.left = (e.pageX - nodeBounds.width/2 - parseInt(style.marginLeft)) + `px`;
                    cloned.style.bottom = (window.innerHeight - (e.pageY + nodeBounds.height/2 - parseInt(style.marginBottom))) + `px`;
        
                    cloned.removeEventListener(`dragstart`, dragstart);
                    cloned.removeEventListener(`dragend`, dragend);
        
                    document.body.appendChild(cloned);
        
                    const bottomOffset = ((nodeBounds.y - e.y + (nodeBounds.height/2)) * -1);
                    const leftOffset = ((nodeBounds.x - e.x + (nodeBounds.width/2)));
        
                    console.log(`bottom offset: ${bottomOffset}; leftOffset: ${leftOffset}`);
        
                    anime({
                        targets: cloned,
                        marginBottom: [bottomOffset, `50px`],
                        marginLeft: [leftOffset, `0px`],
                        opacity: 1,
                        scale: targetScale,
                        duration: 800,
                        easing: `easeOutExpo`,
                        begin: () => {
                            if(hideOriginal) node.style.opacity = 0;
                        }
                    });
        
                    //if(focusableTargets.length == 1) focusTarget();
                } else {
                    initiateDrag(false);
                    lastDragged = node;
                }
            };

            if(enableClickRecognition) {
                let mousedown = false;

                node.addEventListener(`mousedown`, (e) => {
                    let targetElement = e.target;
                    console.log(`mousedown`)

                    while(targetElement != node) {
                        if(targetElement.getAttribute(`dragEnabled`) == `true` || targetElement.getAttribute('href') || targetElement.onmousedown || targetElement.onclick) return;
                        targetElement = targetElement.parentNode;
                    }

                    //if(node.contains(e.target)) return;
                    mousedown = true;
                    startDrag(e);
                });

                node.addEventListener(`mouseup`, (e) => {
                    if(mousedown) {
                        mousedown = false;
                        clearDrag(false);
                    }
                });
            }
    
            node.ondrag = (e) => {
                //console.log(e)
                if(e.pageX && e.pageY) {
                    if(cloned) {
                        //cloned.style.left = e.pageX - cloned.getBoundingClientRect().width/2 + `px`;
                        //cloned.style.bottom = (window.innerHeight - e.pageY) - cloned.getBoundingClientRect().height/2 + `px`;
                        cloned.style.left = e.pageX - nodeBounds.width/2 + `px`;
                        cloned.style.bottom = (window.innerHeight - e.pageY) - nodeBounds.height/2 + `px`;
                    };
                    if(clonedTxt) {
                        clonedTxt.style.left = e.pageX - clonedTxt.getBoundingClientRect().width/2 + `px`;
                        clonedTxt.style.bottom = (window.innerHeight - e.pageY) - clonedTxt.getBoundingClientRect().height/2 + `px`;
                    };
                    if(node.getAttribute(`cloned`) != `true`) {
                        if(node.style.position != `relative`) node.style.position = `relative`;
                        if(!initialOffset) initialOffset = { x: e.x, y: e.y };
                        let left = ((e.x - initialOffset.x)/12)
                        let bottom = ((initialOffset.y - e.y)/12)

                        let leftMult = left < 0 ? -1 : 1;
                        let bottomMult = bottom < 0 ? -1 : 1;

                        let maxLeft = 24;
                        let maxBottom = 12;

                        if(Math.abs(left) > maxLeft) left = maxLeft * leftMult;
                        if(Math.abs(bottom) > maxBottom) bottom = maxBottom * bottomMult;

                        left = dragEasing(Math.abs(left)/maxLeft) * maxLeft * leftMult;
                        bottom = dragEasing(Math.abs(bottom)/maxBottom) * maxBottom * bottomMult;

                        if(!hideOriginal) anime.remove(node);
    
                        node.style.left = left + `px`
                        node.style.bottom = bottom + `px`
                        //console.log(node.style.left, node.style.bottom)
                    }
                }
            };
    
            //returnDrop(true);
    
            const ondragover = (e) => {
                //console.log(`dragover`, e)
                e.preventDefault();
            }; node.ondragover = ondragover;
    
            const dragstart = (e) => {
                console.log(`dragstart`, e);

                startDrag(e);
            }; node.addEventListener(`dragstart`, dragstart);
    
            const dragend = (e) => {
                console.log(`dragend`, e);
    
                if(focusableTargets.length == 1) focusTarget();
    
                setTimeout(() => clearDrag(false), 20)
            }; node.addEventListener(`dragend`, dragend);
        }
    }
}