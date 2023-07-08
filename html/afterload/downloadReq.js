system.downloadReq((...str) => {
    if(str.length > 1) {
        str = str.slice(-1)[0]
    } else {
        str = str[0]
    } // this is a fucking mess

    console.log(`Download request:`, str);


    if(typeof selectTab == `function`) {
        const tab = selectTab(`Download`)
        console.log(tab)
        tab.content.querySelector(`#urlInput`).value = str;
        tab.processURL();
    } else {
        window.location.href = `./index.html?${str}`;
    }
})