module.exports = (content) => {
    console.log(`sending notification ${global.window ? true : false}`, content);

    if(!global.window) {
        return false;
    } else {
        global.window.webContents.send(`notification`, content);
        return true;
    }
}