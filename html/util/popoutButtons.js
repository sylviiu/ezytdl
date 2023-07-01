let popoutActive = false;

const createPopout = ({
    buttons = [],
    completeHook = () => {},
    navigateEvent = () => {},
    closeOnNavigate = false,
    addEventListeners = true,
    updatePosition = false,
    offsetPx = 80,
}={}) => {
    console.log(`closeOnNavigate: ${closeOnNavigate}`);

    let closeable = true;

    let closeableUpdate = () => {};

    const setCloseable = (value) => {
        console.log(`setCloseable: ${value}`);
        if(closeable != value) {
            closeable = value;
            closeableUpdate(closeable);

            document.querySelectorAll(`#popoutOverlayDiv`).forEach(e => {
                anime.remove(e);
                anime({
                    targets: e,
                    backgroundColor: `rgba(0,0,0,${closeable ? 0.6 : 1})`,
                    duration: 900,
                    easing: `easeOutExpo`
                });
            });
        }
    }

    const applyStyle = (element) => {
        element.style.position = `fixed`;
        element.style.top = `0px`;
        element.style.width = `100vw`;
        element.style.height = `100vh`;
        element.style.backgroundColor = `rgba(0,0,0,0)`;
    };

    let closeWindow = () => new Promise(r => r());

    let frame = null;

    let parsedButtons = [];

    for(const o of buttons.filter(o => o.element)) {
        const name = o.heading || o.element.id || `(unnamed)`;
        const button = o.element;
        const href = o.href || o.element.href;

        if(button.id) button.id += `-popout`

        console.log(`Setting button "${name}" as popout to href "${href}"`);

        button.removeAttribute(`href`);

        const click = () => {
            console.log(`button ${name} clicked; popoutActive: ${popoutActive}`);

            const currentNotification = document.body.querySelector(`.notificationBox`);
        
            const overlayDiv = document.createElement(`div`);
        
            applyStyle(overlayDiv);

            overlayDiv.id = `popoutOverlayDiv`;
        
            const overlayCloseText = document.createElement(`h6`);
            
            overlayCloseText.style.pointerEvents = `none`;
            overlayCloseText.style.position = `fixed`;
            overlayCloseText.style.bottom = `${offsetPx/2.5}px`;
            overlayCloseText.style.width = `100vw`;
            overlayCloseText.style.textAlign = `center`;
            overlayCloseText.style.opacity = 0;
            
            overlayCloseText.innerText = `Click anywhere to close.`;

            if(popoutActive) {
                overlayDiv.onclick();
            } else {
                closeWindow();

                popoutActive = true;

                const buttonBounds = button.getBoundingClientRect();

                const clone = popout(button, false, { anchorRight: true, addToBody: false }, { margin: true, padding: true, });

                clone.style.opacity = 1

                const { right, top } = clone.style

                console.log(`loading "${href}"`);

                const h = document.createElement(`iframe`);

                frame = h;

                h.src = href;
                //h.sandbox = `allow-scripts allow-same-origin`;

                let ready = false;

                let secondaryAnimation = () => {
                    if(ready) {
                        anime({
                            targets: h,
                            opacity: 1,
                            scale: [0.5, 1],
                            duration: 700,
                            easing: `easeOutExpo`,
                            complete: () => {
                                overlayDiv.onmouseenter = async () => {
                                    console.log(`mouseenter`);
                
                                    let entered = Math.max(Date.now() + 90);
                
                                    const animate = (closeable) => {
                                        if(pendingCloses.length) {
                                            closeWindow();
                                        } else {
                                            anime.remove(overlayDiv);
                                            anime.remove(overlayCloseText);
                                            anime.remove(h);

                                            const delay = Math.max(0, (entered - Date.now()));
            
                                            console.log(`closeable update: ${closeable} -- delay: ${delay}`)
                
                                            if(closeable) {
                                                anime({
                                                    targets: overlayDiv,
                                                    backgroundColor: `rgba(0,0,0,0.6)`,
                                                    duration: 700,
                                                    delay,
                                                    easing: `easeOutExpo`
                                                });
                
                                                overlayCloseText.innerText = `Click to close.`;
                    
                                                anime({
                                                    targets: overlayCloseText,
                                                    opacity: 0.75,
                                                    duration: 700,
                                                    delay,
                                                    easing: `easeOutExpo`
                                                });
                    
                                                anime({
                                                    targets: h,
                                                    scale: 0.75,
                                                    opacity: 0.9,
                                                    top: `${offsetPx/2}px`,
                                                    right: `${offsetPx/2}px`,
                                                    duration: 700,
                                                    delay,
                                                    easing: `easeOutExpo`
                                                });
                                            } else {
                                                anime({
                                                    targets: overlayDiv,
                                                    backgroundColor: `rgba(0,0,0,1)`,
                                                    duration: 700,
                                                    delay,
                                                    easing: `easeOutExpo`
                                                });
                
                                                overlayCloseText.innerText = `Cannot close now.`;
                    
                                                anime({
                                                    targets: overlayCloseText,
                                                    opacity: 1,
                                                    duration: 700,
                                                    delay,
                                                    easing: `easeOutExpo`
                                                });
                    
                                                anime({
                                                    targets: h,
                                                    scale: 0.8,
                                                    opacity: 0.9,
                                                    top: `${offsetPx/2}px`,
                                                    right: `${offsetPx/2}px`,
                                                    duration: 700,
                                                    delay,
                                                    easing: `easeOutExpo`
                                                });
                                            }
                                        }
                                    }
                
                                    closeableUpdate = (val) => animate(val);
                
                                    animate(closeable);
                                };
                
                                overlayDiv.onmouseleave = () => {
                                    console.log(`mouseleave`);
                
                                    const animate = (closeable) => {
                                        anime.remove(overlayDiv);
                                        anime.remove(overlayCloseText);
                                        anime.remove(h);
                                        
                                        anime({
                                            targets: overlayDiv,
                                            backgroundColor: `rgba(0,0,0,${closeable ? 0.6 : 1})`,
                                            duration: 500,
                                            easing: `easeOutExpo`
                                        });
                                    }
                
                                    closeableUpdate = (val) => animate(val);
                
                                    animate(closeable);
                
                                    anime({
                                        targets: overlayCloseText,
                                        opacity: 0,
                                        duration: 500,
                                        easing: `easeOutExpo`
                                    });
                
                                    anime({
                                        targets: h,
                                        scale: 1,
                                        opacity: 1,
                                        top: `${offsetPx/2}px`,
                                        right: `${offsetPx/2}px`,
                                        duration: 500,
                                        easing: `easeOutExpo`
                                    });
                                };
                
                                let pendingCloses = [];
                
                                closeWindow = (force) => new Promise(res => {
                                    if(typeof force != `boolean`) force = false;
                
                                    console.log(`closeWindow: ${closeable || force} (closeable: ${closeable}) (force: ${force})`)
                
                                    if(closeable || force) {
                                        popoutActive = false;
                                        frame = null;
                
                                        closeWindow = () => new Promise(r => r());
                
                                        closeableUpdate = () => {};
                
                                        anime.remove(overlayDiv);
                                        anime.remove(overlayCloseText);
                                        anime.remove(h);
                
                                        overlayDiv.id += `-removed`;
                
                                        overlayDiv.onmouseenter = null;
                                        overlayDiv.onmouseleave = null;
                
                                        anime({
                                            targets: overlayDiv,
                                            backgroundColor: `rgba(0,0,0,0)`,
                                            duration: 500,
                                            easing: `easeOutExpo`,
                                            complete: () => overlayDiv.remove()
                                        });
                
                                        anime({
                                            targets: overlayCloseText,
                                            opacity: 0,
                                            duration: 500,
                                            easing: `easeOutExpo`
                                        });
                
                                        anime.remove(h);
                                        anime({
                                            targets: h,
                                            scale: 0.35,
                                            left: `${offsetPx}px`,
                                            top: `${offsetPx*-1}px`,
                                            opacity: 0,
                                            duration: 350,
                                            easing: `easeOutExpo`,
                                            complete: () => h.remove()
                                        });
                        
                                        const { x, y } = button.getBoundingClientRect();
                
                                        const newRight = (updatePosition && x ? `${x}px` : null) || right;
                                        const newTop = (updatePosition && y ? `${y}px` : null) || top;
                
                                        console.log(`newRight: ${newRight} (from ${right}) -- newTop: ${newTop} (from ${top})`)
                
                                        anime.remove(clone);
                                        anime({
                                            targets: clone,
                                            opacity: 1,
                                            scale: 1,
                                            right: newRight,
                                            top: newTop,
                                            duration: 650,
                                            easing: `easeOutExpo`,
                                            complete: () => {
                                                clone.remove();
                                                button.style.opacity = 1;
                                                pendingCloses.push(res);
                                                pendingCloses.forEach(r => r());
                                            }
                                        });
                
                                        completeHook();
                                    } else pendingCloses.push(res);
                                });
                
                                overlayDiv.onclick = closeWindow;
                            }
                        });
                    } else ready = true;
                }

                if(currentNotification) {
                    document.body.insertBefore(clone, currentNotification);
                } else {
                    document.body.appendChild(clone);
                }

                anime({
                    targets: clone,
                    right: [right, (window.innerWidth/2) - (buttonBounds.width/2)],
                    top: [top, (window.innerHeight/2) - (buttonBounds.height/2)],
                    easing: `easeOutCirc`,
                    duration: 350,
                });

                anime({
                    targets: clone,
                    scale: window.innerWidth / (buttonBounds.width+2),
                    opacity: 0,
                    easing: `easeInExpo`,
                    duration: 350,
                    complete: secondaryAnimation
                });

                let loads = 0;

                h.onload = () => {
                    h.onload = () => {
                        loads++;

                        console.log(`iframe loaded (${loads})`);

                        if(closeOnNavigate && loads > 1) {
                            console.log(`navigation detected & closeOnNavigate is true; closing`)
                            return closeWindow();
                        } else if(closeOnNavigate) console.log(`navigation detected (${loads}) & closeOnNavigate is true; not closing`)

                        h.contentWindow.repositionNotifications = (...c) => repositionNotifications(...c);
                        h.contentWindow.addNotification = (...c) => repositionNotifications(...c);
                        h.contentWindow.createNotification = (...c) => createNotification(...c);

                        h.contentWindow.parentWindow = typeof parentWindow != `undefined` ? parentWindow : window;

                        h.contentWindow.useHref = typeof useHref != `undefined` ? useHref : closeOnNavigate;

                        h.contentWindow.console.log = (...content) => content.forEach(c => console.log(`iframe ${name}: ${c}`));

                        if(o.heading) {
                            const headingTxt = document.createElement(`h1`);
    
                            headingTxt.style.padding = `24px`;
                            headingTxt.style.width = `100vw`;
                            headingTxt.style.color = `white`;
    
                            headingTxt.innerText = name;
    
                            h.contentWindow.document.body.prepend(headingTxt);
                        };

                        const onclickFunc = e => {
                            const target = e.target;

                            console.log(`iframe click: ${target.onclick ? `onclick func` : target.href ? `link` : `no redirection`} / closeOnNavigate: ${closeOnNavigate}`, e)
    
                            if(target.href || target.onclick) {
                                if(closeOnNavigate) {
                                    closeWindow();
                                } else if(target.href) navigateEvent(e, target.href);
                            }
                        }

                        h.contentWindow.document.onclick = onclickFunc;
                    };

                    h.onload();

                    secondaryAnimation();
                }

                anime.remove(overlayDiv);

                anime({
                    targets: overlayDiv,
                    backgroundColor: `rgba(0,0,0,${closeable ? 0.6 : 1})`,
                    duration: 500,
                    easing: `easeOutExpo`,
                });

                clone.after(overlayDiv);

                applyStyle(h);

                h.style.position = `fixed`;

                h.style.left = null;

                h.style.opacity = 0;

                h.style.top = `${offsetPx/2}px`;
                h.style.right = `${offsetPx/2}px`

                h.style.width = `calc(100vw - ${offsetPx}px)`;
                h.style.height = `calc(100vh - ${offsetPx}px)`;

                h.style.backgroundColor = `rgb(10,10,10)`;

                h.style.borderRadius = `24px`

                overlayDiv.after(h);
                h.after(overlayCloseText);
            }
        }

        if(addEventListeners) button.addEventListener(`click`, click);

        parsedButtons.push({
            name,
            button,
            click
        })
    };

    return {
        close: () => closeWindow(),
        frame: () => frame,
        setCloseable: (val) => setCloseable(val),
        buttons: parsedButtons,
    }
}