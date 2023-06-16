system.downloadReq((...str) => {
    if(str.length > 1) {
        str = str.slice(-1)[0]
    } else {
        str = str[0]
    } // this is a fucking mess

    console.log(`Download request:`, str)

    if(typeof input != `undefined` && typeof processURL == `function`) {
        input.value = str;
        processURL();
    } else {
        window.location.href = `./index.html?${str}`;
    }
})