var updateAvailableBtn = document.getElementById(`updateAvailable`);

var currentProgressCircle = null;

var updateAvailable = false;

var setUpdateButton = (disable=false, func, createProgressCirc) => {
    console.log(`setUpdateButton: ${disable ? `disable` : `enable`}; func? ${func ? true : false}; creating progress circ? ${createProgressCirc ? true : false} (already exists? ${currentProgressCircle ? true : false})`)

    anime.remove(updateAvailableBtn)

    if(disable) {
        anime({
            targets: updateAvailableBtn,
            opacity: [1, 0],
            scale: [1, 0.5],
            duration: 500,
            easing: `easeOutCirc`,
            complete: () => {
                if(updateAvailableBtn.classList.contains(`d-flex`)) updateAvailableBtn.classList.remove(`d-flex`);
                if(!updateAvailableBtn.classList.contains(`d-none`)) updateAvailableBtn.classList.add(`d-none`);
            }
        });
        updateAvailableBtn.onclick = null;
        if(currentProgressCircle) {
            currentProgressCircle.remove();
            currentProgressCircle = null;
        }
    } else {
        if(createProgressCirc && !currentProgressCircle) {
            currentProgressCircle = addProgressCircle(updateAvailableBtn, 8, false, {
                overrideWidth: updateAvailableBtn.style.width,
                overrideHeight: updateAvailableBtn.style.height,
            });
        } else if(!createProgressCirc && currentProgressCircle) {
            currentProgressCircle.remove();
            currentProgressCircle = null;
        }

        anime({
            targets: updateAvailableBtn,
            opacity: [0, 1],
            scale: [0.5, 1],
            duration: 500,
            easing: `easeOutCirc`,
            begin: () => {
                if(!updateAvailableBtn.classList.contains(`d-flex`)) updateAvailableBtn.classList.add(`d-flex`);
                if(updateAvailableBtn.classList.contains(`d-none`)) updateAvailableBtn.classList.remove(`d-none`);
            }
        });

        updateAvailableBtn.onclick = func ? func : () => version.openUpdatePage();
    }
}

var updateChecker = () => {
    updateAvailableBtn = document.getElementById(`updateAvailable`);

    if(updateAvailableBtn) {
        console.log(`updateAvailable Enabled`)

        version.checkForUpdates();

        version.onUpdate(() => {
            updateAvailable = true;
            updateAvailableBtn.style.backgroundColor = `#fff`;
            updateAvailableBtn.style.color = `#000`;
            tabStyle.collapse();
            setUpdateButton();
        });
    
        version.onUpdateProgress(p => {
            console.log(`version update: `, p);

            if(updateAvailable) return;

            if(p && typeof p.progress != `undefined`) {
                updateAvailableBtn.style.backgroundColor = `rgba(255, 255, 255, 0.15)`;
                updateAvailableBtn.style.color = `#fff`;
    
                console.log(`updateprogress`, p)
    
                const { progress, status } = p;
    
                const percent = Number(progress) < 0 ? `(pending)` : `${progress}%`

                updateAvailableBtn.style.scale = 1;

                setUpdateButton(false, () => createNotification({
                    headingText: `Update Status ${percent}`,
                    bodyText: status,
                }), true);
                
                console.log(`setUpateButton: ${updateAvailableBtn.style.width}, ${updateAvailableBtn.style.height} --`, progress)

                currentProgressCircle.setProgress(progress);
            } else setUpdateButton(true);
        })
    }
}