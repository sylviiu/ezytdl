const getSaveOptions = (node, info, overrideDownloadObj) => {
    const formatConversionTextbox = node.querySelector(`#formatConversionTextbox`);
    const convertDownload = node.querySelector(`#convertDownload`);

    let convertInfo = { ext: formatConversionTextbox.value };

    let convert = false;

    if(convertDownload.style.width != `49%`) {
        convert = true;

        node.querySelector(`#audioOptions`).childNodes.forEach(n => {
            if(n && n.placeholder && n.id) convertInfo[n.id] = n.value;
        });

        node.querySelector(`#videoOptions`).childNodes.forEach(n => {
            if(n && n.placeholder && n.id) convertInfo[n.id] = n.value;
        });
    };

    console.log(`convert? ${convert}`, convertInfo)

    if(info.entries) {
        return {
            entries: info.entries.filter(e => !e.entries).map(e => Object.assign({}, {
                url: e.webpage_url || e.url,
                ext: convert ? null : formatConversionTextbox.value,
                convert: convert ? convertInfo : null,
                filePath: node.querySelector(`#saveLocation`).value || null,
                info: e
            }, overrideDownloadObj && typeof overrideDownloadObj == `object` ? overrideDownloadObj : {})),
            info: Object.assign({}, info, { formats: null, entries: null }),
        }
    } else {
        return Object.assign({}, {
            url: info.webpage_url || info.url,
            ext: convert ? null : formatConversionTextbox.value,
            convert: convert ? convertInfo : null,
            filePath: node.querySelector(`#saveLocation`).value || null,
            info: info
        }, overrideDownloadObj && typeof overrideDownloadObj == `object` ? overrideDownloadObj : {});
    }
}