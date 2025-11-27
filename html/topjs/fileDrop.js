var enableDropper = () => {
    const fileUploadThing = document.createElement(`div`);
    fileUploadThing.id = `uploadtarget`
    fileUploadThing.style.width = `100vw`;
    fileUploadThing.style.height = `calc(100vh - 80px)`;
    fileUploadThing.style.position = `fixed`;
    fileUploadThing.style.top = `80px`;
    fileUploadThing.style.left = `0px`;
    fileUploadThing.style.display = `flex`;
    fileUploadThing.style.visibility = `hidden`;
    fileUploadThing.style.pointerEvents = `none`;
    fileUploadThing.style.opacity = `0`;
    fileUploadThing.style.background = `rgba(0,0,0,0.35)`;
    fileUploadThing.style.justifyContent = `center`;
    fileUploadThing.style.alignItems = `center`;
    fileUploadThing.style.flexDirection = `column`;

    const fileUploadThingContainer = document.createElement(`div`);
    fileUploadThingContainer.style.display = `flex`;
    fileUploadThingContainer.style.pointerEvents = `none`;
    fileUploadThingContainer.style.alignItems = `center`;
    fileUploadThingContainer.style.flexDirection = `column`;
    fileUploadThingContainer.style.transform = `scale(0.85)`;
    fileUploadThing.appendChild(fileUploadThingContainer);

    const uploadIcon = document.createElement(`i`);
    uploadIcon.className = `fas fa-circle-right`;
    uploadIcon.style.fontSize = `50px`;
    uploadIcon.style.display = `revert`;
    uploadIcon.id = `icon`;
    fileUploadThingContainer.appendChild(uploadIcon);

    const loadingIcon = document.createElement(`i`);
    loadingIcon.className = `fas fa-circle-notch`;
    loadingIcon.style.fontSize = `50px`;
    loadingIcon.style.animation = `rotating 2s linear infinite`;
    loadingIcon.style.display = `none`;
    loadingIcon.id = `icon`;
    fileUploadThingContainer.appendChild(loadingIcon);

    const uploadTxt = document.createElement(`h2`);
    uploadTxt.style.marginTop = `16px`;
    uploadTxt.innerText = `Convert File`;
    fileUploadThingContainer.appendChild(uploadTxt);

    document.body.appendChild(fileUploadThing);

    let dragging = false;
    let dragtimeout = null;

    const uploadThing = {
        show: () => {
            dragging = true;
            console.log(`DRAGGED IN`);
            fileUploadThing.style.visibility = `visible`;
            fileUploadThing.style.pointerEvents = `all`;
            uploadIcon.style.display = `revert`;
            loadingIcon.style.display = `none`;
            anime.remove(fileUploadThing);
            anime({
                targets: fileUploadThing,
                opacity: `1`,
                //scale: `1`,
                easing: `easeOutExpo`,
                duration: 500,
            });
            anime.remove(fileUploadThingContainer);
            anime({
                targets: fileUploadThingContainer,
                scale: 1,
                easing: `easeOutExpo`,
                duration: 1000,
            });
            /*anime.remove(everything);
            anime({
                targets: everything,
                filter: `blur(8px)`,
                easing: `easeOutExpo`,
                duration: 500
            })*/
            if(!everything.classList.contains('blurred')) everything.classList.add('blurred');
        },
        processing: () => {
            uploadIcon.style.display = `none`;
            loadingIcon.style.display = `revert`;
        },
        hide: () => {
            dragging = true;
            console.log(`DRAGGED OUT`);
            fileUploadThing.style.pointerEvents = `none`;
            anime.remove(fileUploadThing);
            anime({
                targets: fileUploadThing,
                opacity: `0`,
                //scale: `1.15`,
                easing: `easeOutExpo`,
                duration: 500,
                complete: () => {
                    fileUploadThing.style.visibility = `invisible`;
                }
            });
            anime.remove(fileUploadThingContainer);
            anime({
                targets: fileUploadThingContainer,
                scale: 0.85,
                easing: `easeOutExpo`,
                duration: 1000,
            });
            /*anime.remove(everything);
            anime({
                targets: everything,
                filter: `blur(0px)`,
                easing: `easeOutExpo`,
                duration: 500
            })*/
            if(everything.classList.contains('blurred')) everything.classList.remove('blurred');
        }
    }

    window.addEventListener('dragenter', e => {
        e.preventDefault();
        e.stopPropagation();
        if(dragtimeout) {
            clearTimeout(dragtimeout);
            dragtimeout = null;
        };
        dragging = true;
        console.log(`showing thing`);
        uploadThing.show();
    });

    const dragHandle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = `copy`;
    }

    fileUploadThing.addEventListener(`dragenter`, dragHandle);
    fileUploadThing.addEventListener(`dragover`, dragHandle);

    fileUploadThing.addEventListener(`drop`, async e => {
        e.preventDefault();
        e.stopPropagation();

        console.log(`file dropped!`);

        uploadThing.processing();

        if(e?.dataTransfer?.files?.length > 0) {
            const files = Object.values(e.dataTransfer.files).map(f => system.showFilePath(f));
            
            const tab = await selectTab(`Convert`);

            console.log(`adding ${files.join(`, `)}`);

            files.forEach(f => console.log(tab.addToList(f)))
        }

        uploadThing.hide();
    });

    /*fileUploadThing.addEventListener('mouseleave', e => {
        console.log(`left window`);
        dragging = false;
        dragtimeout = setTimeout(() => {
            if(!dragging) uploadThing.hide();
        }, 150);
    });*/

    fileUploadThing.addEventListener('dragleave', e => {
        console.log(`left drag`);
        dragging = false;
        dragtimeout = setTimeout(() => {
            if(!dragging) uploadThing.hide();
        }, 150);
    });
}