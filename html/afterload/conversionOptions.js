const conversionOptions = (node, info) => {
    //node.querySelector(`#saveLocation`).placeholder = `${config && config.saveLocation ? config.saveLocation : `{default save location}`}`;
    //node.querySelector(`#saveLocation`).value = `${config && config.saveLocation ? config.saveLocation : ``}`;
    node.querySelector(`#basedir`).innerText = `${config && config.saveLocation ? config.saveLocation : `Save Location`}`;

    //console.log(`config`, config)

    //console.log(`video conversion enabled`)
    if(info.resolution) node.querySelector(`#videoResolution`).placeholder = `${info.resolution}`
    if(info.vbr) node.querySelector(`#videoBitrate`).placeholder = `Bitrate (${info.vbr}k)`
    if(info.fps) node.querySelector(`#videoFPS`).placeholder = `FPS (${info.fps})`

    //console.log(`audio conversion enabled`)
    if(info.asr) node.querySelector(`#audioSampleRate`).placeholder = `Sample Rate (${info.asr/1000}k)`
    if(info.abr) node.querySelector(`#audioBitrate`).placeholder = `Bitrate (${info.abr}k)`
    
    node.querySelector(`#convertDownload`).onclick = () => {
        const ffmpegOptions = node.querySelector(`#ffmpegOptions`);

        ffmpegOptions.classList.remove(`d-none`);

        const ffmpegBoundingClientRect = ffmpegOptions.getBoundingClientRect()

        console.log(ffmpegBoundingClientRect.height);

        const formattxtbox = node.querySelector(`#formatConversionTextbox`);

        formattxtbox.parentElement.removeChild(formattxtbox);

        node.querySelector(`#conversionDiv`).appendChild(formattxtbox);

        const add = [
            parseInt(window.getComputedStyle(ffmpegOptions).marginBottom),
            parseInt(window.getComputedStyle(ffmpegOptions).marginTop),
            parseInt(window.getComputedStyle(node).marginTop),
        ]

        const newHeight = (ffmpegBoundingClientRect.height + add.reduce((a, b) => a + b, 0));

        console.log(`newHeight`, newHeight)

        if(config.reduceAnimations) {
            ffmpegOptions.style.maxHeight = newHeight + `px`;
            anime({
                targets: ffmpegOptions,
                opacity: [`0%`, `100%`],
                duration: 500,
                easing: `easeOutExpo`,
                complete: () => {
                    ffmpegOptions.style.maxHeight = ``;
                }
            });
        } else {
            anime({
                targets: ffmpegOptions,
                maxHeight: [`0px`, newHeight + `px`],
                opacity: [`0%`, `100%`],
                duration: 500,
                easing: `easeOutExpo`,
                complete: () => {
                    ffmpegOptions.style.maxHeight = ``;
                }
            });
        }

        anime({
            targets: node.querySelector(`#convertDownload`),
            width: [`49%`, `0%`],
            maxWidth: [`49%`, `0%`],
            opacity: [1, 0],
            duration: 500,
            easing: `easeOutExpo`,
        });
        anime({
            targets: node.querySelector(`#confirmDownload`),
            width: [`49%`, `100%`],
            duration: 500,
            easing: `easeOutExpo`,
        });
    }
}