function idGen(num) {
    let retVal = "";
    let charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var length = 5;
    if(num) {
         length = Math.round(num);
    }
    for (var i = 0, n = charset.length; i < length; ++i) {
         retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}