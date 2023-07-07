const getSaveOptions = (node, info, overrideDownloadObj, {
    getConvertOnly = false,
    ignore = [],
}={}) => {
    const formatConversionTextbox = node.querySelector(`#outputExtension`);
    const convertDownload = node.querySelector(`#convertDownload`);

    let convertInfo = { ext: formatConversionTextbox.value };

    let convert = (info.selectedConversion && hasFFmpeg) ? true : false;

    if(convert) {
        convert = true;

        if(info.selectedConversion.key == `custom`) {
            node.querySelector(`#audioOptions`).childNodes.forEach(n => {
                if(n && n.placeholder && n.id && !ignore.find(o => o == n.id)) convertInfo[n.id] = n.value;
            });
    
            node.querySelector(`#videoOptions`).childNodes.forEach(n => {
                if(n && n.placeholder && n.id && !ignore.find(o => o == n.id)) convertInfo[n.id] = n.value;
            });
    
            if(config.advanced) node.querySelector(`#additional`).childNodes.forEach(n => {
                if(n && n.placeholder && n.id && !ignore.find(o => o == n.id)) convertInfo[n.id] = n.value;
            });
        } else if(info.selectedConversion.options) {
            convertInfo = info.selectedConversion.options;
        } else throw new Error(`Invalid conversion option -- not custom and doesn't have options obj`, info.selectedConversion)

        console.log(node.querySelector(`#trimContainer`), node.querySelector(`#trimContainer`).childNodes)

        if(!node.querySelector(`#trimOptions`).classList.contains(`d-none`)) node.querySelector(`#trimContainer`).childNodes.forEach(n => {
            if(n && n.id && n.value && n.max && n.value != (n.id == `trimTo` ? n.max : n.min) && !ignore.find(o => o == n.id)) convertInfo[n.id] = util.time(Number(n.value)*1000, null, {allowZero: true}).timestamp;
        });
    };

    console.log(`convert? ${convert}`, convertInfo);

    if(getConvertOnly) return convertInfo;

    let addMetadata = {};

    if(node.querySelector(`#metadataOptions`)) node.querySelector(`#metadataOptions`).querySelectorAll(`.btn`).forEach(m => {
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
                filePath: (node.querySelector(`#saveLocation`) ? node.querySelector(`#saveLocation`).value : null) || null,
                addMetadata,
                info: Object.assign({}, info, e, { entries: null, formats: null })
            }, overrideDownloadObj && typeof overrideDownloadObj == `object` ? overrideDownloadObj : {})),
            info,
        }
    } else {
        return Object.assign({}, {
            url: info.webpage_url || info.url,
            ext: convert ? null : formatConversionTextbox.value,
            format: info.format_id || info.formats ? info.formats[0].format_id : null,
            convert: convert ? convertInfo : null,
            filePath: (node.querySelector(`#saveLocation`) ? node.querySelector(`#saveLocation`).value : null) || null,
            addMetadata,
            info: info
        }, overrideDownloadObj && typeof overrideDownloadObj == `object` ? overrideDownloadObj : {});
    }
}