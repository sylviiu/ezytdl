const getSaveOptions = (node, info, overrideDownloadObj) => {
    const formatConversionTextbox = node.querySelector(`#formatConversionTextbox`);
    const convertDownload = node.querySelector(`#convertDownload`);

    let convertInfo = { ext: formatConversionTextbox.value };

    let convert = false;

    if(convertDownload.style.width != `49%` && hasFFmpeg) {
        convert = true;

        node.querySelector(`#audioOptions`).childNodes.forEach(n => {
            if(n && n.placeholder && n.id) convertInfo[n.id] = n.value;
        });

        node.querySelector(`#videoOptions`).childNodes.forEach(n => {
            if(n && n.placeholder && n.id) convertInfo[n.id] = n.value;
        });
    };

    console.log(`convert? ${convert}`, convertInfo)

    let addMetadata = {};

    node.querySelector(`#metadataOptions`).querySelectorAll(`.btn`).forEach(m => {
        const active = m.getAttribute(`value`) == `true`;
        console.log(`${m.id}: ${active}`)
        addMetadata[m.id] = active
    });

    console.log(`addMetadata`, addMetadata)

    if(info.entries) {
        return {
            entries: info.entries.filter(e => !e.entries).map(e => Object.assign({}, {
                url: e.webpage_url || e.url,
                ext: convert ? null : formatConversionTextbox.value,
                convert: convert ? convertInfo : null,
                filePath: node.querySelector(`#saveLocation`).value || null,
                addMetadata,
                info: e
            }, overrideDownloadObj && typeof overrideDownloadObj == `object` ? overrideDownloadObj : {})),
            info,
        }
    } else {
        return Object.assign({}, {
            url: info.webpage_url || info.url,
            ext: convert ? null : formatConversionTextbox.value,
            format: info.format_id || info.formats ? info.formats[0].format_id : null,
            convert: convert ? convertInfo : null,
            filePath: node.querySelector(`#saveLocation`).value || null,
            addMetadata,
            info: info
        }, overrideDownloadObj && typeof overrideDownloadObj == `object` ? overrideDownloadObj : {});
    }
}